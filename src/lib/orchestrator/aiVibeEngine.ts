import { musicOrchestrator } from './orchestrator';
import { NormalizedSong } from './types';
import { logger } from '@/lib/logger';

export interface AIVibeParams {
  prompt?: string;
  moodId?: string;
  limit?: number;
}

export interface AIVibeResult {
  title: string;
  moodName: string;
  description: string;
  songs: NormalizedSong[];
  aiProviderUsed?: 'gemini' | 'nvidia' | 'fallback';
}

const PRESET_MAP: Record<string, { name: string; desc: string; defaultQueries: string[] }> = {
  chill: {
    name: 'Chill & Calm',
    desc: 'Unwind with soothing melodies & acoustic vibes',
    defaultQueries: ['chill acoustic', 'lofi beats', 'calm piano', 'soft songs', 'relaxing acoustic'],
  },
  gym: {
    name: 'Workout Hype',
    desc: 'High energy tracks to power your session',
    defaultQueries: ['workout hype', 'gym rock', 'high energy edm', 'punjabi pump', 'bass boosted'],
  },
  focus: {
    name: 'Deep Focus',
    desc: 'Lofi beats & ambient sounds for deep concentration',
    defaultQueries: ['study lofi', 'ambient focus', 'classical piano', 'instrumental chill', 'deep work'],
  },
  sad: {
    name: 'Melancholy',
    desc: 'Emotional tunes for quiet moments & rainy days',
    defaultQueries: ['sad romantic', 'emotional acoustic', 'heartbreak melodies', 'slow unplugged', 'soft ballad'],
  },
  party: {
    name: 'Party Night',
    desc: 'Dance hits & upbeat bangers to get the party going',
    defaultQueries: ['bollywood party', 'dance bangers', 'club remix', 'punjabi dance', 'upbeat pop'],
  },
  midnight: {
    name: 'Midnight Drive',
    desc: 'Atmospheric soundscapes & late night drive vibes',
    defaultQueries: ['night drive lofi', 'synthwave vibe', 'late night melody', 'retro drive', 'deep synth'],
  },
  romance: {
    name: 'Romantic Melodies',
    desc: 'Heartfelt love songs & sweet melodies',
    defaultQueries: ['arijit singh love', 'romantic acoustic', 'bollywood love songs', 'sweet duet', 'romantic unplugged'],
  },
  roadtrip: {
    name: 'Highway Trip',
    desc: 'Upbeat anthems for cruising down the open road',
    defaultQueries: ['travel pop', 'summer anthem', 'roadtrip drive', 'upbeat acoustic', 'highway vibes'],
  },
};

export class AIVibeEngine {
  private geminiApiKey = process.env.GEMINI_API_KEY || '';
  private nvidiaApiKey = process.env.NVIDIA_API_KEY || '';

  async generateVibePlaylist(params: AIVibeParams): Promise<AIVibeResult> {
    const { prompt = '', moodId = '', limit = 15 } = params;

    const preset = moodId ? PRESET_MAP[moodId.toLowerCase()] : null;
    const effectivePrompt = (prompt.trim() || preset?.name || 'chill music vibes').trim();
    const moodName = preset?.name || prompt || 'Custom AI Vibe';
    const description = preset?.desc || `AI-curated music stream tailored for '${effectivePrompt}'.`;

    let searchQueries: string[] = [];
    let aiProviderUsed: 'gemini' | 'nvidia' | 'fallback' = 'fallback';

    // Strategy 1: Try Google Gemini API (gemini-2.5-flash / gemini-2.0-flash)
    if (this.geminiApiKey) {
      try {
        const queries = await this.queryGemini(effectivePrompt);
        if (queries && queries.length > 0) {
          searchQueries = queries;
          aiProviderUsed = 'gemini';
        }
      } catch (err: any) {
        logger.error({ err }, 'Gemini AI API call failed, falling back to next provider');
      }
    }

    // Strategy 2: Try NVIDIA AI NIM API if Gemini failed or key missing
    if (searchQueries.length === 0 && this.nvidiaApiKey) {
      try {
        const queries = await this.queryNvidia(effectivePrompt);
        if (queries && queries.length > 0) {
          searchQueries = queries;
          aiProviderUsed = 'nvidia';
        }
      } catch (err: any) {
        logger.error({ err }, 'NVIDIA AI API call failed, falling back to smart keyword generator');
      }
    }

    // Strategy 3: Fallback to preset or smart keyword expansion
    if (searchQueries.length === 0) {
      aiProviderUsed = 'fallback';
      if (preset) {
        searchQueries = preset.defaultQueries;
      } else {
        const words = effectivePrompt.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2);
        searchQueries = words.length > 0 ? words.map((w) => `${w} songs`) : ['top songs', 'trending acoustic', 'chill hits'];
      }
    }

    // Execute multi-provider search for each query string concurrently
    const searchPromises = searchQueries.map(async (query) => {
      try {
        const res = await musicOrchestrator.search({ q: query, source: 'all', limit: 5 });
        return res.items;
      } catch (e) {
        return [];
      }
    });

    const results = await Promise.all(searchPromises);

    // Combine & Deduplicate returned songs
    const aggregatedSongs: NormalizedSong[] = [];
    const seenKeys = new Set<string>();

    for (const songList of results) {
      for (const song of songList) {
        const key = musicOrchestrator.generateSongKey(song.title, song.artist.name);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          aggregatedSongs.push(song);
        }
      }
    }

    const finalSongs = aggregatedSongs.slice(0, limit);

    return {
      title: `Sonexa AI • ${moodName}`,
      moodName,
      description,
      songs: finalSongs,
      aiProviderUsed,
    };
  }

  private async queryGemini(prompt: string): Promise<string[] | null> {
    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;

    const systemInstruction = `You are a music recommendation AI. The user gives a vibe/mood: "${prompt}". Return ONLY a raw JSON array of 5 to 7 song/artist/genre search query strings that fit this vibe. Example format: ["Kesariya Arijit Singh", "Chill acoustic lofi", "Tum Hi Ho"]. Do not include markdown or explanations.`;

    const payload = {
      contents: [{ parts: [{ text: systemInstruction }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // Try fallback to gemini-2.0-flash if 2.5 is not accessible
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!fallbackRes.ok) return null;
      const json = await fallbackRes.json();
      return this.parseJsonResponse(json?.candidates?.[0]?.content?.parts?.[0]?.text);
    }

    const json = await res.json();
    return this.parseJsonResponse(json?.candidates?.[0]?.content?.parts?.[0]?.text);
  }

  private async queryNvidia(prompt: string): Promise<string[] | null> {
    const url = 'https://integrate.api.nvidia.com/v1/chat/completions';

    const payload = {
      model: 'meta/llama-3.1-70b-instruct',
      messages: [
        {
          role: 'system',
          content: 'You are a music AI. Return ONLY a valid JSON array of 5 to 7 search query strings for songs/artists matching the requested vibe. No explanations.',
        },
        {
          role: 'user',
          content: `Vibe: "${prompt}". Return JSON array.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.nvidiaApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    return this.parseJsonResponse(content);
  }

  private parseJsonResponse(text?: string): string[] | null {
    if (!text) return null;
    try {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter((item) => item.length > 0);
      }
    } catch (e) {
      logger.error({ text }, 'Failed to parse AI JSON response');
    }
    return null;
  }
}

export const aiVibeEngine = new AIVibeEngine();
