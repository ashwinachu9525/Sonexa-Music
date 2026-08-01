import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getOrComputeCache } from '@/lib/cache';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const cacheKey = 'home_dashboard_data';
    const responseData = await getOrComputeCache(cacheKey, 60, async () => {
      // Fetch latest 10 for recently played
      const recentlyPlayed = await prisma.song.findMany({
        take: 10,
        select: {
          id: true, title: true, coverImage: true, duration: true, fileUrl: true,
          artist: { select: { id: true, name: true } },
          album: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Fetch 5 random/trending songs
      const trending = await prisma.song.findMany({
        take: 5,
        select: {
          id: true, title: true, coverImage: true, duration: true, fileUrl: true,
          artist: { select: { id: true, name: true } },
          album: { select: { id: true, title: true } }
        },
        orderBy: { title: 'asc' }
      });

      // Fetch latest 5 albums
      const recommendedAlbums = await prisma.album.findMany({
        take: 5,
        select: {
          id: true, title: true, coverImage: true, releaseDate: true,
          artist: { select: { id: true, name: true } }
        },
        orderBy: { releaseDate: 'desc' }
      });

      const formatSong = (song: any) => ({
        ...song,
        fileUrl: `${baseUrl}/api/v1/songs/${song.id}/play`,
        coverImage: song.coverImage ? `${baseUrl}/api/v1/songs/${song.id}/cover` : null
      });

      const formatAlbum = (album: any) => ({
        ...album,
        coverImage: album.coverImage ? `${baseUrl}/api/v1/albums/${album.id}/cover` : null
      });

      return {
        recentlyPlayed: recentlyPlayed.map(formatSong),
        trendingSongs: trending.map(formatSong),
        recommendedAlbums: recommendedAlbums.map(formatAlbum)
      };
    });

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error: any) {
    logger.error({ err: error }, "Home API Error");
    return NextResponse.json({ error: "Failed to fetch home data" }, { status: 500 });
  }
}
