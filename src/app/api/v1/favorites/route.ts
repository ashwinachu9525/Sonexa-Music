import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/v1/favorites?email=user@example.com
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

    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      include: {
        song: {
          include: { artist: true, album: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const songs = favorites.map(fav => ({
      ...fav.song,
      fileUrl: `${baseUrl}/api/v1/songs/${fav.song.id}/play`,
      coverImage: fav.song.coverImage ? `${baseUrl}/api/v1/songs/${fav.song.id}/cover` : null,
      isFavorite: true
    }));

    return NextResponse.json({ songs });
  } catch (error: any) {
    console.error('Fetch favorites error:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

// POST /api/v1/favorites  { email, songId }
export async function POST(request: Request) {
  try {
    const { email, songId } = await request.json();

    if (!email || !songId) {
      return NextResponse.json({ error: 'email and songId are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existing = await prisma.favorite.findFirst({
      where: { userId: user.id, songId }
    });

    if (existing) {
      // Toggle OFF — remove from favorites
      await prisma.favorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ isFavorite: false, message: 'Removed from favorites' });
    } else {
      // Toggle ON — add to favorites
      await prisma.favorite.create({
        data: { userId: user.id, songId }
      });
      return NextResponse.json({ isFavorite: true, message: 'Added to favorites' });
    }
  } catch (error: any) {
    console.error('Toggle favorite error:', error);
    return NextResponse.json({ error: 'Failed to toggle favorite' }, { status: 500 });
  }
}
