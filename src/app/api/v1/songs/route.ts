import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { redis } from '@/lib/redis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '20';
  const search = searchParams.get('search');

  const cacheKey = `songs:page:${page}:limit:${limit}:search:${search || 'none'}`;
  
  if (!search) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }
  }

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
    include: { artist: true, album: true },
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

  if (!search) {
    const responseData = { data: modifiedSongs, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } };
    await redis.set(cacheKey, JSON.stringify(responseData), 'EX', 60);
    return NextResponse.json(responseData);
  }
  return NextResponse.json({ data: modifiedSongs, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
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
      }
    });

    const keys = await redis.keys('songs:page:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return NextResponse.json(song, { status: 201 });
  } catch (error: any) {
    console.error(error.message || 'Failed to create song');
    return NextResponse.json({ error: 'Failed to create song' }, { status: 500 });
  }
}
