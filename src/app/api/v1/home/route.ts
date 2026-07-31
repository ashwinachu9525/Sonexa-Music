import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { redis } from '@/lib/redis';

export async function GET(request: Request) {
  try {
    const cacheKey = 'home_dashboard_data';
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }

    // Fetch latest 10 for recently played (mock logic, ideally from UserPlayHistory)
    const recentlyPlayed = await prisma.song.findMany({
      take: 10,
      include: { artist: true, album: true },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch 5 random/trending songs
    const trending = await prisma.song.findMany({
      take: 5,
      include: { artist: true, album: true },
      orderBy: { title: 'asc' } // Placeholder for trending logic
    });

    // Fetch latest 5 albums
    const recommendedAlbums = await prisma.album.findMany({
      take: 5,
      include: { artist: true },
      orderBy: { releaseDate: 'desc' }
    });

    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const formatSong = (song: any) => ({
      ...song,
      fileUrl: `${baseUrl}/api/v1/songs/${song.id}/play`,
      coverImage: song.coverImage ? `${baseUrl}/api/v1/songs/${song.id}/cover` : null
    });

    const formatAlbum = (album: any) => ({
      ...album,
      coverImage: album.coverImage ? `${baseUrl}/api/v1/albums/${album.id}/cover` : null
    });

    const responseData = {
      recentlyPlayed: recentlyPlayed.map(formatSong),
      trendingSongs: trending.map(formatSong),
      recommendedAlbums: recommendedAlbums.map(formatAlbum)
    };

    await redis.set(cacheKey, JSON.stringify(responseData), 'EX', 60);

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Home API Error:", error);
    return NextResponse.json({ error: "Failed to fetch home data" }, { status: 500 });
  }
}
