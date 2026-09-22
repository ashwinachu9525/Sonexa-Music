import { LocalMusicProvider } from './providers/local';
import { JioSaavnProvider } from './providers/jiosaavn';
import { resolveFallbackLyrics } from './lyricsResolver';
import prisma from '@/lib/db';
import {
  MusicProvider,
  MusicSearchResult,
  MusicSource,
  NormalizedSong,
  SearchParams,
  MusicLyricsResult,
  MusicStreamResult,
} from './types';
import { logger } from '@/lib/logger';

export class MusicOrchestrator {
  private providers: Map<MusicSource, MusicProvider>;
  private providerPriority: MusicSource[];

  constructor(priority: MusicSource[] = ['local', 'jiosaavn']) {
    this.providerPriority = priority;
    this.providers = new Map();

    // Register default providers
    const localProvider = new LocalMusicProvider();
    const jiosaavnProvider = new JioSaavnProvider();

    this.providers.set(localProvider.name, localProvider);
    this.providers.set(jiosaavnProvider.name, jiosaavnProvider);
  }

  public generateSongKey(title: string, artistName: string): string {
    const sanitize = (text: string) =>
      text.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${sanitize(title)}_${sanitize(artistName)}`;
  }

  async search(params: SearchParams): Promise<MusicSearchResult> {
    const sourceParam = params.source || 'all';
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;

    const providerStatus: Record<string, { success: boolean; error?: string }> = {};
    let allItems: NormalizedSong[] = [];

    let targetSources: MusicSource[] = [];
    if (sourceParam === 'local') {
      targetSources = ['local'];
    } else if (sourceParam === 'jiosaavn') {
      targetSources = ['jiosaavn'];
    } else {
      targetSources = [...this.providerPriority];
    }

    const queryPromises = targetSources.map(async (src) => {
      const provider = this.providers.get(src);
      if (!provider) {
        return {
          source: src,
          success: false,
          error: `Provider ${src} not registered`,
          items: [],
        };
      }

      try {
        const items = await provider.search(params);
        return { source: src, success: true, items };
      } catch (error: any) {
        logger.error({ err: error, provider: src }, 'Orchestrator provider search failed');
        return {
          source: src,
          success: false,
          error: error?.message || `Failed to fetch from ${src}`,
          items: [],
        };
      }
    });

    const results = await Promise.all(queryPromises);

    const itemsByProvider = new Map<MusicSource, NormalizedSong[]>();

    for (const res of results) {
      providerStatus[res.source] = {
        success: res.success,
        ...(res.error ? { error: res.error } : {}),
      };
      if (res.success) {
        itemsByProvider.set(res.source, res.items);
      }
    }

    const seenKeys = new Set<string>();

    for (const src of targetSources) {
      const items = itemsByProvider.get(src) || [];
      for (const item of items) {
        const key = this.generateSongKey(item.title, item.artist.name);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allItems.push(item);
        }
      }
    }

    const total = allItems.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = allItems.slice(startIndex, startIndex + limit);
    const hasNext = startIndex + limit < total;

    return {
      query: params.q || '',
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        hasNext,
      },
      providers: providerStatus,
    };
  }

  async getSong(source: MusicSource, id: string): Promise<NormalizedSong | null> {
    const provider = this.providers.get(source);
    if (!provider) {
      throw new Error(`Provider ${source} not registered`);
    }
    return provider.getSong(id);
  }

  async getLyrics(source: MusicSource, id: string): Promise<MusicLyricsResult | null> {
    const provider = this.providers.get(source);
    if (!provider) {
      throw new Error(`Provider ${source} not registered`);
    }

    // Step 1: Query primary provider for lyrics
    const primaryResult = await provider.getLyrics(id);

    if (primaryResult && primaryResult.lyrics && primaryResult.lyrics.trim()) {
      return {
        songId: id,
        source,
        lyrics: primaryResult.lyrics,
        provider: source,
        isFallback: false,
      };
    }

    // Step 2: Primary provider returned no lyrics -> Fallback to LRCLib API
    const song = await this.getSong(source, id);
    if (!song) {
      return {
        songId: id,
        source,
        lyrics: null,
        provider: source,
        isFallback: false,
      };
    }

    const fallback = await resolveFallbackLyrics(song.title, song.artist.name, song.duration);

    if (fallback && fallback.lyrics && fallback.lyrics.trim()) {
      // If song is local, asynchronously persist resolved fallback lyrics to DB
      if (source === 'local') {
        prisma.song
          .update({
            where: { id },
            data: { lyrics: fallback.lyrics },
          })
          .catch((err) => {
            logger.error({ err, id }, 'Failed to persist fallback lyrics to DB');
          });
      }

      return {
        songId: id,
        source,
        lyrics: fallback.lyrics,
        provider: 'lrclib',
        isFallback: true,
      };
    }

    return {
      songId: id,
      source,
      lyrics: null,
      provider: source,
      isFallback: false,
    };
  }

  async getStream(source: MusicSource, id: string): Promise<MusicStreamResult | null> {
    const provider = this.providers.get(source);
    if (!provider) {
      throw new Error(`Provider ${source} not registered`);
    }
    return provider.getStream(id);
  }
}

export const musicOrchestrator = new MusicOrchestrator();
