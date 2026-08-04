import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get songs in a playlist
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: playlistId } = await context.params;

    const playlistSongs = await prisma.playlistSong.findMany({
      where: { playlistId },
      include: { 
        song: {
          include: {
            artist: true,
            album: true
          }
        } 
      },
      orderBy: { addedAt: 'desc' }
    });

    // Extract just the songs from the join table records
    const songs = playlistSongs.map(ps => ps.song);

    return NextResponse.json({ songs });
  } catch (error: any) {
    console.error('Get playlist songs error:', error);
    return NextResponse.json({ error: 'Failed to get playlist songs' }, { status: 500 });
  }
}

// Add a song to a playlist
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: playlistId } = await context.params;
    const { songId } = await request.json();

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    // Check if it already exists to prevent duplicates
    const existing = await prisma.playlistSong.findUnique({
      where: {
        playlistId_songId: {
          playlistId,
          songId
        }
      }
    });

    if (existing) {
      return NextResponse.json({ message: 'Song already in playlist' }, { status: 200 });
    }

    const playlistSong = await prisma.playlistSong.create({
      data: {
        playlistId,
        songId
      },
      include: {
        song: true
      }
    });

    return NextResponse.json({ message: 'Song added to playlist', playlistSong });
  } catch (error: any) {
    console.error('Add song to playlist error:', error);
    return NextResponse.json({ error: 'Failed to add song to playlist' }, { status: 500 });
  }
}

// Remove a song from a playlist
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: playlistId } = await context.params;
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    await prisma.playlistSong.delete({
      where: {
        playlistId_songId: {
          playlistId,
          songId
        }
      }
    });

    return NextResponse.json({ message: 'Song removed from playlist' });
  } catch (error: any) {
    console.error('Remove song from playlist error:', error);
    return NextResponse.json({ error: 'Failed to remove song from playlist' }, { status: 500 });
  }
}
