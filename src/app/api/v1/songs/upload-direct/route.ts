import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, R2_BUCKET_NAME, getPublicUrl } from '@/lib/storage';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import * as musicMetadata from 'music-metadata';

const ffmpegPath = ffmpegInstaller.path;

// Run ffmpeg and return on success / throw on failure
function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);
    const stderr: string[] = [];
    proc.stderr.on('data', (d) => stderr.push(d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-5).join('')}`));
    });
    proc.on('error', reject);
  });
}

type Strategy = {
  ffmpegArgs: (input: string, output: string) => string[];
  outputExt: string;
  contentType: string;
  label: string;
};

/**
 * Decides the best output format based on input codec/container and bitrate.
 *
 * Quality priority:
 *  - Lossless input (FLAC, WAV, AIFF, PCM) → store as FLAC (lossless, ~40% smaller than WAV)
 *  - High-quality lossy input (MP3/AAC/OGG >= 192kbps) → stream-copy to preserve exact quality
 *  - Low-quality lossy input (< 192kbps) → re-encode to AAC 256k (better codec, higher quality)
 */
function getStrategy(ext: string, isLosslessMeta: boolean, bitrate?: number): Strategy {
  const losslessExts = ['flac', 'wav', 'aiff', 'aif', 'alac'];
  const isLosslessExt = losslessExts.includes(ext);

  // --- Lossless → FLAC (stream copy if already FLAC, else convert) ---
  if (isLosslessExt || isLosslessMeta) {
    if (ext === 'flac') {
      return {
        ffmpegArgs: (i, o) => ['-y', '-i', i, '-c:a', 'copy', o],
        outputExt: 'flac',
        contentType: 'audio/flac',
        label: 'Lossless FLAC (stream copy)',
      };
    }
    return {
      ffmpegArgs: (i, o) => ['-y', '-i', i, '-c:a', 'flac', '-compression_level', '8', o],
      outputExt: 'flac',
      contentType: 'audio/flac',
      label: `Lossless FLAC (converted from ${ext.toUpperCase()})`,
    };
  }

  // --- M4A / AAC → stream copy (already an efficient codec) ---
  if (ext === 'm4a' || ext === 'aac') {
    return {
      ffmpegArgs: (i, o) => ['-y', '-i', i, '-c:a', 'copy', o],
      outputExt: 'm4a',
      contentType: 'audio/mp4',
      label: 'AAC/M4A (stream copy)',
    };
  }

  // --- OGG / OPUS → stream copy if high quality, else re-encode to AAC ---
  if (ext === 'ogg' || ext === 'opus') {
    const br = bitrate ?? 0;
    if (br >= 192000) {
      return {
        ffmpegArgs: (i, o) => ['-y', '-i', i, '-c:a', 'copy', o],
        outputExt: 'ogg',
        contentType: 'audio/ogg',
        label: 'OGG (stream copy)',
      };
    }
    return {
      ffmpegArgs: (i, o) => ['-y', '-i', i, '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', o],
      outputExt: 'm4a',
      contentType: 'audio/mp4',
      label: 'Upgraded to AAC 256k (was low-bitrate OGG)',
    };
  }

  // --- MP3 → stream copy if >= 192kbps, else upgrade to AAC 256k ---
  if (ext === 'mp3') {
    const br = bitrate ?? 0;
    if (br >= 192000) {
      return {
        ffmpegArgs: (i, o) => ['-y', '-i', i, '-c:a', 'copy', o],
        outputExt: 'mp3',
        contentType: 'audio/mpeg',
        label: `MP3 (stream copy, ${Math.round(br / 1000)}kbps)`,
      };
    }
    return {
      ffmpegArgs: (i, o) => ['-y', '-i', i, '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', o],
      outputExt: 'm4a',
      contentType: 'audio/mp4',
      label: `Upgraded to AAC 256k (was ${Math.round(br / 1000)}kbps MP3)`,
    };
  }

  // --- Fallback: unknown format → AAC 256k ---
  return {
    ffmpegArgs: (i, o) => ['-y', '-i', i, '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', o],
    outputExt: 'm4a',
    contentType: 'audio/mp4',
    label: `AAC 256k (fallback from .${ext})`,
  };
}

export async function POST(req: NextRequest) {
  const tempId = uuidv4();
  let inputPath = '';
  let outputPath = '';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const originalExt = (file.name.split('.').pop() || 'mp3').toLowerCase();
    inputPath = join(tmpdir(), `input_${tempId}.${originalExt}`);

    // Write uploaded bytes to a temp file
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, originalBuffer);

    // --- Extract audio metadata to make an informed quality decision ---
    let audioMetadata: Record<string, any> = {};
    let isLosslessMeta = false;
    let bitrate: number | undefined;

    try {
      const meta = await musicMetadata.parseBuffer(originalBuffer, file.type || 'audio/mpeg');
      const fmt = meta.format;
      isLosslessMeta = fmt.lossless ?? false;
      bitrate = fmt.bitrate;

      const bitDepth = fmt.bitsPerSample ?? 16;
      const sampleRate = fmt.sampleRate ?? 44100;
      const isHiRes = isLosslessMeta && (bitDepth >= 24 || sampleRate > 48000);

      audioMetadata = {
        codec: fmt.codec,
        container: fmt.container,
        sampleRate,
        bitDepth,
        bitrate,
        channels: fmt.numberOfChannels,
        isLossless: isLosslessMeta,
        isHiRes,
        isDolbyAtmos: false,
        isSpatialAudio: false,
        duration: fmt.duration,
      };
    } catch (metaErr) {
      console.warn('Warning: Failed to parse audio metadata, using defaults:', metaErr);
    }

    // --- Decide strategy ---
    const strategy = getStrategy(originalExt, isLosslessMeta, bitrate);
    outputPath = join(tmpdir(), `output_${tempId}.${strategy.outputExt}`);

    console.log(`🎵 Upload strategy: ${strategy.label} | File: ${file.name}`);

    await runFFmpeg(strategy.ffmpegArgs(inputPath, outputPath));

    // --- Read output and upload to R2 ---
    const outputBuffer = await readFile(outputPath);
    const key = `audio/${tempId}.${strategy.outputExt}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: outputBuffer,
      ContentType: strategy.contentType,
      // Store metadata so the /play proxy serves the right Content-Type header
      Metadata: {
        'original-filename': file.name,
        'upload-strategy': strategy.label,
      },
    }));

    const publicUrl = getPublicUrl(key);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      key,
      strategy: strategy.label,
      metadata: audioMetadata,
    });

  } catch (error) {
    console.error('Error in upload-direct:', error);
    return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
  } finally {
    // Always cleanup temp files, even on error
    await Promise.allSettled([
      inputPath ? unlink(inputPath).catch(() => {}) : Promise.resolve(),
      outputPath ? unlink(outputPath).catch(() => {}) : Promise.resolve(),
    ]);
  }
}
