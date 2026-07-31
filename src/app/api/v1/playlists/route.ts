import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Create a new playlist
export async function POST(request: Request) {
  try {
    const { name, email, description } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const playlist = await prisma.playlist.create({
      data: {
        name,
        description,
        userId: user.id
      },
    });

    return NextResponse.json({ message: 'Playlist created', playlist });
  } catch (error: any) {
    console.error('Playlist creation error:', error);
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
  }
}

// Get user's playlists
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const playlists = await prisma.playlist.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { songs: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ playlists });
  } catch (error: any) {
    console.error('Fetch playlists error:', error);
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
}
