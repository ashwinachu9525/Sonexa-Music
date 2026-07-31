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
    if (!song || !song.coverImage) {
      return new NextResponse('Cover image not found', { status: 404 });
    }

    const bucketName = process.env.R2_BUCKET_NAME || '';
    
    // Extract the R2 object key from the stored URL.
    const keyParts = song.coverImage.split(`/${bucketName}/`);
    const key = keyParts.length > 1 ? keyParts[1] : song.coverImage; 
    
    if (!key) {
      return new NextResponse('Invalid file URL format', { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: decodeURIComponent(key),
    });

    const response = await s3Client.send(command);
    
    // Convert Node.js readable stream to Web Stream for NextResponse
    const stream = response.Body?.transformToWebStream();

    if (!stream) {
      throw new Error("Failed to get stream from R2");
    }

    return new NextResponse(stream, {
      headers: {
        'Content-Type': response.ContentType || 'image/jpeg',
        'Content-Length': response.ContentLength?.toString() || '',
        // Allow CDNs (like Cloudflare/Vercel) to aggressively cache this stream
        'Cache-Control': 'public, s-maxage=31536000, max-age=31536000, immutable',
      }
    });

  } catch (error: any) {
    console.error('Error proxying cover image stream:', error.message || error);
    return new NextResponse('Error streaming cover image', { status: 500 });
  }
}
