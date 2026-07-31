import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const song = await prisma.song.findUnique({ where: { id } });
    if (!song || !song.fileUrl) {
      return new NextResponse('Song not found', { status: 404 });
    }

    const bucketName = process.env.R2_BUCKET_NAME || '';
    
    const keyParts = song.fileUrl.split(`/${bucketName}/`);
    const key = keyParts.length > 1 ? keyParts[1] : song.fileUrl; 
    
    if (!key) {
      return new NextResponse('Invalid file URL format', { status: 400 });
    }

    // Handle Range Requests for iOS AVPlayer
    const rangeHeader = request.headers.get('range');
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: decodeURIComponent(key),
      Range: rangeHeader || undefined,
    });

    const response = await s3Client.send(command);
    
    const stream = response.Body?.transformToWebStream();

    if (!stream) {
      throw new Error("Failed to get stream from R2");
    }

    const headers: Record<string, string> = {
      'Content-Type': response.ContentType || 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, s-maxage=31536000, max-age=31536000, immutable',
    };

    if (response.ContentLength) {
      headers['Content-Length'] = response.ContentLength.toString();
    }
    if (response.ContentRange) {
      headers['Content-Range'] = response.ContentRange;
    }

    // If a range was requested, return 206 Partial Content
    const status = rangeHeader && response.ContentRange ? 206 : 200;

    return new NextResponse(stream, {
      status,
      headers
    });

  } catch (error: any) {
    console.error('Error proxying song stream:', error.message || error);
    return new NextResponse('Error streaming song', { status: 500 });
  }
}
