import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getOrComputeCache } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { s3Client } from '@/lib/storage';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cacheKey = `song_db_info:${id}`;

    // Cache the DB response for 24 hours since file URLs rarely change
    const song = await getOrComputeCache(cacheKey, 86400, async () => {
      return prisma.song.findUnique({
        where: { id },
        select: { fileUrl: true },
      });
    });

    if (!song || !song.fileUrl) {
      return new NextResponse('Song not found', { status: 404 });
    }

    const rangeHeader = request.headers.get('range');

    // A) Try S3 / Cloudflare R2 GetObjectCommand
    try {
      const bucketName = process.env.R2_BUCKET_NAME || '';
      let key = song.fileUrl;

      if (bucketName && key.includes(`/${bucketName}/`)) {
        key = key.split(`/${bucketName}/`)[1];
      } else if (key.startsWith('http://') || key.startsWith('https://')) {
        try {
          const urlObj = new URL(key);
          key = urlObj.pathname.replace(/^\//, '');
        } catch (_) {}
      }

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: decodeURIComponent(key),
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
      logger.warn({ err: r2Error?.message, songId: id, fileUrl: song.fileUrl }, 'R2 S3 stream failed in /play, trying direct fetch fallback');
    }

    // B) Fallback: Proxy directly from public HTTP/HTTPS URL
    if (song.fileUrl.startsWith('http://') || song.fileUrl.startsWith('https://')) {
      const fetchHeaders: Record<string, string> = {};
      if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

      const directRes = await fetch(song.fileUrl, { headers: fetchHeaders });
      if (directRes.ok || directRes.status === 206) {
        const resHeaders: Record<string, string> = {
          'Content-Type': directRes.headers.get('content-type') || 'audio/mpeg',
          'Accept-Ranges': 'bytes',
        };
        if (directRes.headers.get('content-length')) resHeaders['Content-Length'] = directRes.headers.get('content-length')!;
        if (directRes.headers.get('content-range')) resHeaders['Content-Range'] = directRes.headers.get('content-range')!;

        return new NextResponse(directRes.body as any, {
          status: directRes.status,
          headers: resHeaders,
        });
      }
    }

    return new NextResponse('Error streaming song', { status: 500 });
  } catch (error: any) {
    logger.error({ err: error, songId: (await params).id }, 'Error proxying song stream');
    return new NextResponse('Error streaming song', { status: 500 });
  }
}
