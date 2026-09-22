import prisma from '@/lib/db';
import {
  MusicProvider,
  MusicSource,
  NormalizedSong,
  SearchParams,
  MusicLyricsResult,
  MusicStreamResult,
} from '../types';

export class LocalMusicProvider implements MusicProvider {
  name: MusicSource = 'local';

  async search(params: SearchParams): Promise<NormalizedSong[]> {
    const { q, page = 1, limit = 20, artist, album, genre } = params;
    const skip = (page - 1) * limit;

    const whereConditions: any[] = [];

    if (q && q.trim()) {
      const query = q.trim();
      whereConditions.push({
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { artist: { name: { contains: query, mode: 'insensitive' } } },
          { album: { title: { contains: query, mode: 'insensitive' } } },
        ],
      });
    }

    if (artist && artist.trim()) {
      whereConditions.push({
        artist: { name: { contains: artist.trim(), mode: 'insensitive' } },
      });
    }

    if (album && album.trim()) {
      whereConditions.push({
        album: { title: { contains: album.trim(), mode: 'insensitive' } },
      });
    }

    if (genre && genre.trim()) {
      whereConditions.push({
        genre: { name: { contains: genre.trim(), mode: 'insensitive' } },
      });
    }

    const whereClause = whereConditions.length > 0 ? { AND: whereConditions } : {};

    const songs = await prisma.song.findMany({
      skip,
      take: limit,
      where: whereClause,
      include: {
        artist: true,
        album: true,
        genre: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return songs.map((song) => this.normalizeSong(song));
  }

  async getSong(id: string): Promise<NormalizedSong | null> {
    const song = await prisma.song.findUnique({
      where: { id },
      include: {
        artist: true,
        album: true,
        genre: true,
      },
    });

    if (!song) return null;
    return this.normalizeSong(song);
  }

  async getLyrics(id: string): Promise<MusicLyricsResult | null> {
    const song = await prisma.song.findUnique({
      where: { id },
      select: { id: true, lyrics: true },
    });

    if (!song) return null;

    return {
      songId: song.id,
      source: 'local',
      lyrics: song.lyrics || null,
    };
  }

  async getStream(id: string): Promise<MusicStreamResult | null> {
    const song = await prisma.song.findUnique({
      where: { id },
      select: { id: true, fileUrl: true },
    });

    if (!song || !song.fileUrl) return null;

    return {
      songId: song.id,
      source: 'local',
      url: `/api/v1/music/local/${song.id}/stream`,
      mimeType: 'audio/mpeg',
      expiresAt: null,
    };
  }

  private normalizeSong(song: any): NormalizedSong {
    const coverUrl = song.coverImage || song.album?.coverImage || null;

    return {
      id: song.id,
      source: 'local',
      title: song.title,
      artist: {
        id: song.artistId || song.artist?.id,
        name: song.artist?.name || 'Unknown Artist',
      },
      album: song.album
        ? {
            id: song.albumId || song.album.id,
            title: song.album.title,
            coverImage: song.album.coverImage || undefined,
          }
        : undefined,
      duration: song.duration || 0,
      lyrics: song.lyrics || null,
      audio: {
        url: `/api/v1/music/local/${song.id}/stream`,
        mimeType: 'audio/mpeg',
        expiresAt: null,
      },
      images: {
        thumbnail: coverUrl,
        cover: coverUrl,
      },
      audioQuality: {
        codec: song.codec,
        container: song.container,
        sampleRate: song.sampleRate,
        bitDepth: song.bitDepth,
        bitrate: song.bitrate,
        channels: song.channels,
        isLossless: song.isLossless,
        isHiRes: song.isHiRes,
        isDolbyAtmos: song.isDolbyAtmos,
        isSpatialAudio: song.isSpatialAudio,
      },
    };
  }
}
