import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { redis } from '@/lib/redis';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();

    let artistId = data.artistId;
    let albumId = data.albumId;
    const artistName = data.artistName;
    const albumTitle = data.albumTitle;

    // Handle Artist update if provided by name
    if (!artistId && artistName) {
      let artist = await prisma.artist.findFirst({ where: { name: artistName } });
      if (!artist) {
        artist = await prisma.artist.create({ data: { name: artistName } });
      }
      artistId = artist.id;
    }

    // Handle Album update if provided by title
    if (!albumId && albumTitle && artistId) {
      let album = await prisma.album.findFirst({ where: { title: albumTitle, artistId: artistId } });
      if (!album) {
        album = await prisma.album.create({ 
          data: { title: albumTitle, releaseDate: new Date(), artistId: artistId } 
        });
      }
      albumId = album.id;
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;
    if (data.genreId !== undefined) updateData.genreId = data.genreId;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.musicBy !== undefined) updateData.musicBy = data.musicBy;
    if (data.starring !== undefined) updateData.starring = data.starring;
    if (data.directedBy !== undefined) updateData.directedBy = data.directedBy;
    if (data.label !== undefined) updateData.label = data.label;
    
    if (albumId) updateData.albumId = albumId;
    if (artistId) updateData.artistId = artistId;

    const song = await prisma.song.update({
      where: { id },
      data: updateData,
    });

    // Invalidate caches
    const keys = await redis.keys('songs:page:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    return NextResponse.json(song);
  } catch (error: any) {
    console.error('Error updating song:', error);
    
    // Check if it's a Prisma schema mismatch error
    if (error.message && error.message.includes('Unknown argument')) {
      return NextResponse.json({ error: 'Database schema mismatch. Please restart your Next.js dev server.' }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Failed to update song details.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    await prisma.song.delete({
      where: { id }
    });

    const keys = await redis.keys('songs:page:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting song:', error.message || error);
    return NextResponse.json({ error: 'Failed to delete song' }, { status: 500 });
  }
}
