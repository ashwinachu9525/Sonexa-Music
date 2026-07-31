import { NextResponse } from 'next/server';
import { generatePresignedUploadUrl, getPublicUrl } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const { fileName, contentType, folder = 'songs' } = await request.json();
    const key = `${folder}/${Date.now()}-${fileName.replace(/\s+/g, '-')}`;
    const url = await generatePresignedUploadUrl(key, contentType);
    const publicUrl = getPublicUrl(key);
    
    return NextResponse.json({ uploadUrl: url, publicUrl, key });
  } catch (error: any) {
    console.error(error.message || 'Failed to generate presigned URL');
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
  }
}
