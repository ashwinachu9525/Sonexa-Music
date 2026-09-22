import { getOrComputeCache } from '@/lib/cache';
import { logger } from '@/lib/logger';
import {
  MusicProvider,
  MusicSource,
  NormalizedSong,
  SearchParams,
  MusicLyricsResult,
  MusicStreamResult,
} from '../types';

const JIOSAAVN_BASE_URL =
  process.env.JIOSAAVN_API_URL || 'https://jio-saven-production.up.railway.app';
const TIMEOUT_MS = Number(process.env.JIOSAAVN_TIMEOUT_MS) || 5000;

export class JioSaavnProvider implements MusicProvider {
  name: MusicSource = 'jiosaavn';

  private async fetchWithTimeout(url: string, timeoutMs = TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36 SonexaMusic/1.0',
        },
      });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  async search(params: SearchParams): Promise<NormalizedSong[]> {
    const query = params.q?.trim() || 'top songs';
    const cacheKey = `jiosaavn:search:${encodeURIComponent(query)}`;

    return getOrComputeCache(cacheKey, 1800, async () => {
      try {
        const url = `${JIOSAAVN_BASE_URL}/api/search/songs?query=${encodeURIComponent(query)}`;
        const response = await this.fetchWithTimeout(url);

        if (!response.ok) {
          throw new Error(`JioSaavn search failed with HTTP ${response.status}`);
        }

        const json = await response.json();
        const results = json?.data?.results || (Array.isArray(json?.data) ? json.data : []);

        if (!Array.isArray(results)) {
          return [];
        }

        return results
          .map((item: any) => this.normalizeSong(item))
          .filter((song): song is NormalizedSong => song !== null);
      } catch (error: any) {
        logger.error({ err: error, query }, 'JioSaavnProvider.search failed');
        throw error;
      }
    });
  }

  async getSong(id: string): Promise<NormalizedSong | null> {
    const cacheKey = `jiosaavn:song:${id}`;

    return getOrComputeCache(cacheKey, 3600, async () => {
      try {
        const url = `${JIOSAAVN_BASE_URL}/api/songs/${encodeURIComponent(id)}`;
        const response = await this.fetchWithTimeout(url);

        if (!response.ok) {
          if (response.status === 404) return null;
          throw new Error(`JioSaavn getSong failed with HTTP ${response.status}`);
        }

        const json = await response.json();
        const songData =
          json?.data?.[0] ||
          json?.data?.results?.[0] ||
          (Array.isArray(json?.data) ? json.data[0] : json?.data);

        if (!songData) return null;
        return this.normalizeSong(songData);
      } catch (error: any) {
        logger.error({ err: error, id }, 'JioSaavnProvider.getSong failed');
        return null;
      }
    });
  }

  async getLyrics(id: string): Promise<MusicLyricsResult | null> {
    // JioSaavn upstream API does not provide a lyrics route.
    // Return null to trigger automatic LRCLib fallback in MusicOrchestrator.
    return {
      songId: id,
      source: 'jiosaavn',
      lyrics: null,
    };
  }

  async getStream(id: string): Promise<MusicStreamResult | null> {
    const song = await this.getSong(id);
    if (!song || !song.audio?.url) return null;

    return {
      songId: id,
      source: 'jiosaavn',
      url: song.audio.url,
      mimeType: song.audio.mimeType || 'audio/mpeg',
      expiresAt: song.audio.expiresAt || null,
    };
  }

  private normalizeSong(item: any): NormalizedSong | null {
    if (!item || (!item.id && !item.name && !item.title)) return null;

    const id = String(item.id);
    const title = item.title || item.name || 'Unknown Title';

    // Artist extraction logic
    let artistName = 'Unknown Artist';
    let artistId: string | undefined;

    if (item.artists?.primary && Array.isArray(item.artists.primary) && item.artists.primary.length > 0) {
      artistName = item.artists.primary.map((a: any) => a.name).join(', ');
      artistId = item.artists.primary[0]?.id;
    } else if (item.primaryArtists) {
      artistName = item.primaryArtists;
    } else if (item.artist) {
      artistName = item.artist;
    }

    // Duration extraction
    let duration = 0;
    if (typeof item.duration === 'number') {
      duration = item.duration;
    } else if (typeof item.duration === 'string') {
      duration = parseInt(item.duration, 10) || 0;
    }

    // Image extraction (highest quality last)
    let coverUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    if (Array.isArray(item.image) && item.image.length > 0) {
      thumbnailUrl = item.image[0]?.url || item.image[0]?.link || null;
      coverUrl = item.image[item.image.length - 1]?.url || item.image[item.image.length - 1]?.link || null;
    } else if (typeof item.image === 'string') {
      coverUrl = item.image;
      thumbnailUrl = item.image;
    }

    // Stream / Download URL extraction (highest quality last)
    let audioUrl = '';
    if (Array.isArray(item.downloadUrl) && item.downloadUrl.length > 0) {
      audioUrl = item.downloadUrl[item.downloadUrl.length - 1]?.url || item.downloadUrl[item.downloadUrl.length - 1]?.link || '';
    } else if (typeof item.downloadUrl === 'string') {
      audioUrl = item.downloadUrl;
    } else if (item.url) {
      audioUrl = item.url;
    }

    return {
      id,
      source: 'jiosaavn',
      title,
      artist: {
        id: artistId,
        name: artistName,
      },
      album: item.album
        ? {
            id: item.album.id ? String(item.album.id) : undefined,
            title: typeof item.album === 'string' ? item.album : item.album.name || item.album.title,
            coverImage: coverUrl || undefined,
          }
        : undefined,
      duration,
      lyrics: null,
      audio: {
        url: audioUrl,
        mimeType: 'audio/mpeg',
        expiresAt: null,
      },
      images: {
        thumbnail: thumbnailUrl,
        cover: coverUrl,
      },
    };
  }
}
