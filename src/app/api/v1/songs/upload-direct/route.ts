import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, R2_BUCKET_NAME, getPublicUrl } from '@/lib/storage';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { writeFile, unlink } from 'fs/promises';
import { createReadStream } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import * as musicMetadata from 'music-metadata';

const ffmpegPath = ffmpegInstaller.path;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const isLossless = formData.get('isLossless') === 'true'; // Optional: if they upload a FLAC they want to keep lossless

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const originalBuffer = Buffer.from(await file.arrayBuffer());
    
    // Generate unique temp paths
    const tempId = uuidv4();
    const originalExt = file.name.split('.').pop();
    const inputPath = join(tmpdir(), `input_${tempId}.${originalExt}`);
    const outputExt = isLossless ? 'flac' : 'ogg';
    const outputPath = join(tmpdir(), `output_${tempId}.${outputExt}`);
    
    // Write the raw uploaded file to disk temporarily
    await writeFile(inputPath, originalBuffer);

    // Compress the audio using raw ffmpeg child process
    await new Promise<void>((resolve, reject) => {
      let args: string[] = [];
      
      if (isLossless && file.name.endsWith('.flac')) {
        // If it's already FLAC and lossless, just copy it to output path
        args = ['-i', inputPath, '-c:a', 'copy', outputPath];
      } else {
        // Encode to Ogg Vorbis at 320kbps
        args = ['-y', '-i', inputPath, '-c:a', 'libvorbis', '-b:a', '320k', outputPath];
      }

      const process = spawn(ffmpegPath, args);

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
      
      process.on('error', (err) => {
        console.error('FFmpeg process error:', err);
        reject(err);
      });
    });

    // Extract metadata from the original uploaded file
    let audioMetadata = {};
    try {
      const metadata = await musicMetadata.parseBuffer(originalBuffer, file.type || 'audio/mpeg');
      const bitDepth = metadata.format.bitsPerSample || 16;
      const sampleRate = metadata.format.sampleRate || 44100;
      const isLosslessMeta = metadata.format.lossless || false;
      const isHiRes = isLosslessMeta && (bitDepth >= 24 || sampleRate > 48000);
      
      audioMetadata = {
        codec: metadata.format.codec,
        container: metadata.format.container,
        sampleRate: sampleRate,
        bitDepth: bitDepth,
        bitrate: metadata.format.bitrate,
        channels: metadata.format.numberOfChannels,
        isLossless: isLosslessMeta,
        isHiRes: isHiRes,
        duration: metadata.format.duration
      };
    } catch (metaErr) {
      console.warn('Failed to extract audio metadata:', metaErr);
    }

    // Upload the compressed file to R2
    const key = `audio/${tempId}.${outputExt}`;
    const contentType = isLossless ? 'audio/flac' : 'audio/ogg';
    const fileStream = createReadStream(outputPath);

    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
    });

    await s3Client.send(putCommand);

    // Cleanup temp files (do not await, let it happen in background)
    Promise.all([
      unlink(inputPath).catch(console.error),
      unlink(outputPath).catch(console.error)
    ]);

    const publicUrl = getPublicUrl(key);

    return NextResponse.json({ 
      success: true,
      url: publicUrl,
      key: key,
      metadata: audioMetadata
    });
    
  } catch (error) {
    console.error('Error in direct upload:', error);
    return NextResponse.json({ error: 'Failed to upload and compress audio' }, { status: 500 });
  }
}
