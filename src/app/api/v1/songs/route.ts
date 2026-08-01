import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getOrComputeCache, clearCacheByPrefix } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '20';
  const search = searchParams.get('search');

  try {
    const cacheKey = `songs:page:${page}:limit:${limit}:search:${search || 'none'}`;
    
    // We only cache if there's no search query, or we can cache search queries with shorter TTL.
    // For now, caching everything with stampede prevention.
    const ttl = search ? 30 : 60; // 30s for search, 60s for standard pages

    const responseData = await getOrComputeCache(cacheKey, ttl, async () => {
      const skip = (Number(page) - 1) * Number(limit);
      
      const whereClause = search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { artist: { name: { contains: search, mode: 'insensitive' as const } } }
        ]
      } : {};

      const songs = await prisma.song.findMany({
        skip,
        take: Number(limit),
        where: whereClause,
        select: {
          id: true, title: true, duration: true, coverImage: true,
          codec: true, container: true, sampleRate: true, bitDepth: true,
          bitrate: true, channels: true, isLossless: true, isHiRes: true,
          isDolbyAtmos: true, isSpatialAudio: true,
          artist: { select: { id: true, name: true } },
          album: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const host = request.headers.get('host') || 'localhost:3000';
      const baseUrl = `${protocol}://${host}`;

      // Rewrite the URLs so mobile clients use our CDN-cacheable proxy routes
      const modifiedSongs = songs.map(song => ({
        ...song,
        fileUrl: `${baseUrl}/api/v1/songs/${song.id}/play`,
        coverImage: song.coverImage ? `${baseUrl}/api/v1/songs/${song.id}/cover` : null
      }));

      const total = await prisma.song.count({ where: whereClause });

      return {
        data: modifiedSongs,
        meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
      };
    });

    const headers = {
      'Cache-Control': 'public, max-age=10, s-maxage=30, stale-while-revalidate=60'
    };

    return NextResponse.json(responseData, { headers });
  } catch (error: any) {
    logger.error({ err: error }, "Songs GET API Error");
    return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    let artistId = data.artistId;
    let albumId = data.albumId;
    const artistName = data.artistName || 'Unknown Artist';
    const albumTitle = data.albumTitle || 'Unknown Album';

    if (!artistId) {
      let artist = await prisma.artist.findFirst({ where: { name: artistName } });
      if (!artist) {
        artist = await prisma.artist.create({ data: { name: artistName } });
      }
      artistId = artist.id;
    }

    if (!albumId) {
      let album = await prisma.album.findFirst({ where: { title: albumTitle, artistId: artistId } });
      if (!album) {
        album = await prisma.album.create({ 
          data: { title: albumTitle, releaseDate: new Date(), artistId: artistId } 
        });
      }
      albumId = album.id;
    }

    const song = await prisma.song.create({
      data: {
        title: data.title,
        duration: data.duration || 0,
        fileUrl: data.fileUrl,
        albumId: albumId,
        artistId: artistId,
        genreId: data.genreId,
        coverImage: data.coverImage,
        lyrics: data.lyrics,
        musicBy: data.musicBy,
        starring: data.starring,
        directedBy: data.directedBy,
        label: data.label,
        codec: data.codec,
        container: data.container,
        sampleRate: data.sampleRate,
        bitDepth: data.bitDepth,
        bitrate: data.bitrate,
        channels: data.channels,
        isLossless: data.isLossless,
        isHiRes: data.isHiRes,
        isDolbyAtmos: data.isDolbyAtmos,
        isSpatialAudio: data.isSpatialAudio,
      }
    });

    await clearCacheByPrefix('songs:page:');
    return NextResponse.json(song, { status: 201 });
  } catch (error: any) {
    logger.error({ err: error }, "Failed to create song");
    return NextResponse.json({ error: 'Failed to create song' }, { status: 500 });
  }
}
