import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { s3Client } from '@/lib/storage';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { musicOrchestrator } from '@/lib/orchestrator/orchestrator';
import { MusicSource } from '@/lib/orchestrator/types';
import { logger } from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ source: string; id: string }> }
) {
  try {
    const { source, id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    if (source !== 'local' && source !== 'jiosaavn') {
      return NextResponse.json(
        { success: false, error: "Invalid music source. Must be 'local' or 'jiosaavn'." },
        { status: 400 }
      );
    }

    const streamInfo = await musicOrchestrator.getStream(source as MusicSource, id);

    if (!streamInfo || !streamInfo.url) {
      return NextResponse.json(
        { success: false, error: `Stream URL not found for song '${id}'` },
        { status: 404 }
      );
    }

    // Return JSON metadata only if explicitly requested via ?format=json
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: streamInfo,
      });
    }

    // ---------------------------------------------------------------------------
    // 1. LOCAL MUSIC STREAMING
    // ---------------------------------------------------------------------------
    if (source === 'local') {
      const song = await prisma.song.findUnique({
        where: { id },
        select: { fileUrl: true },
      });

      if (!song || !song.fileUrl) {
        return new NextResponse('Local song file not found', { status: 404 });
      }

      // If fileUrl is a public HTTP/HTTPS URL, redirect directly for browser playback
      if (song.fileUrl.startsWith('http://') || song.fileUrl.startsWith('https://')) {
        return NextResponse.redirect(song.fileUrl, 302);
      }

      // Otherwise stream from S3 / R2 Bucket
      try {
        const bucketName = process.env.R2_BUCKET_NAME || '';
        const rangeHeader = request.headers.get('range');

        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: decodeURIComponent(song.fileUrl),
          Range: rangeHeader || undefined,
        });

        const response = await s3Client.send(command);
        const stream = response.Body?.transformToWebStream();

        if (stream) {
          const headers: Record<string, string> = {
            'Content-Type': response.ContentType || 'audio/mpeg',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
          };

          if (response.ContentLength) {
            headers['Content-Length'] = response.ContentLength.toString();
          }
          if (response.ContentRange) {
            headers['Content-Range'] = response.ContentRange;
          }

          const status = rangeHeader && response.ContentRange ? 206 : 200;

          return new NextResponse(stream, {
            status,
            headers,
          });
        }
      } catch (r2Error: any) {
        logger.warn({ err: r2Error?.message, songId: id, fileUrl: song.fileUrl }, 'R2 S3 stream failed');
      }

      return new NextResponse('Unable to stream local audio file', { status: 500 });
    }

    // ---------------------------------------------------------------------------
    // 2. JIOSAAVN MUSIC STREAMING
    // Redirect directly to high-speed CDN audio URL (saavncdn.com supports CORS & Range)
    // ---------------------------------------------------------------------------
    if (source === 'jiosaavn') {
      let targetUrl = streamInfo.url;
      if (targetUrl.startsWith('http://')) {
        targetUrl = targetUrl.replace('http://', 'https://');
      }
      return NextResponse.redirect(targetUrl, 302);
    }

    return new NextResponse('Unsupported music source', { status: 400 });
  } catch (error: any) {
    logger.error({ err: error }, 'Error processing audio stream request');
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process audio stream' },
      { status: 500 }
    );
  }
}
