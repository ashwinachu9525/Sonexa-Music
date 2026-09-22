import { getOrComputeCache } from '@/lib/cache';
import { logger } from '@/lib/logger';

export interface ResolvedLyrics {
  lyrics: string | null;
  provider: 'lrclib';
  isSynced: boolean;
}

export async function resolveFallbackLyrics(
  title: string,
  artistName: string,
  duration?: number
): Promise<ResolvedLyrics | null> {
  if (!title || !title.trim()) return null;

  const cleanTitle = title.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
  const firstArtist = artistName ? artistName.split(',')[0].split('&')[0].trim() : '';

  const cacheKey = `lrclib:lyrics:${encodeURIComponent(cleanTitle.toLowerCase())}:${encodeURIComponent(firstArtist.toLowerCase())}`;

  return getOrComputeCache(cacheKey, 86400, async () => {
    try {
      // Step 1: Try exact GET endpoint first
      if (firstArtist) {
        const getUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(firstArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
        const getRes = await fetch(getUrl, {
          headers: {
            'User-Agent': 'SonexaMusic/1.0 (https://github.com/aswin/SonexaMusic)',
          },
        });

        if (getRes.ok) {
          const item = await getRes.json();
          const lyrics = item?.syncedLyrics || item?.plainLyrics;
          if (lyrics && lyrics.trim()) {
            return {
              lyrics,
              provider: 'lrclib',
              isSynced: Boolean(item.syncedLyrics),
            };
          }
        }
      }

      // Step 2: Fallback to Search API endpoint
      const searchQuery = `${cleanTitle} ${firstArtist}`.trim();
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'SonexaMusic/1.0 (https://github.com/aswin/SonexaMusic)',
        },
      });

      if (!searchRes.ok) return null;

      const results = await searchRes.json();
      if (!Array.isArray(results) || results.length === 0) return null;

      // Filter and rank candidate results for optimal relevancy
      const scoredCandidates = results
        .map((item: any) => {
          const lyrics = item?.syncedLyrics || item?.plainLyrics;
          if (!lyrics || !lyrics.trim()) return null;

          let score = 0;
          const isSynced = Boolean(item?.syncedLyrics);
          if (isSynced) score += 50;

          const itemTrack = (item.trackName || '').toLowerCase().trim();
          const targetTrack = cleanTitle.toLowerCase().trim();
          if (itemTrack === targetTrack) {
            score += 40;
          } else if (itemTrack.includes(targetTrack) || targetTrack.includes(itemTrack)) {
            score += 20;
          }

          const itemArtist = (item.artistName || '').toLowerCase().trim();
          const targetArtist = firstArtist.toLowerCase().trim();
          if (targetArtist && itemArtist.includes(targetArtist)) {
            score += 30;
          }

          if (duration && typeof item.duration === 'number') {
            const diff = Math.abs(item.duration - duration);
            if (diff <= 5) score += 20;
            else if (diff <= 15) score += 10;
          }

          return {
            lyrics,
            isSynced,
            score,
          };
        })
        .filter((c): c is { lyrics: string; isSynced: boolean; score: number } => c !== null);

      if (scoredCandidates.length === 0) return null;

      // Sort by score descending
      scoredCandidates.sort((a, b) => b.score - a.score);
      const best = scoredCandidates[0];

      return {
        lyrics: best.lyrics,
        provider: 'lrclib',
        isSynced: best.isSynced,
      };
    } catch (error: any) {
      logger.error({ err: error, title, artistName }, 'resolveFallbackLyrics failed');
      return null;
    }
  });
}
