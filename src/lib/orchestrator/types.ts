export type MusicSource = 'local' | 'jiosaavn';

export interface NormalizedArtist {
  id?: string;
  name: string;
}

export interface NormalizedAlbum {
  id?: string;
  title?: string;
  coverImage?: string;
}

export interface AudioQuality {
  codec?: string | null;
  container?: string | null;
  sampleRate?: number | null;
  bitDepth?: number | null;
  bitrate?: number | null;
  channels?: number | null;
  isLossless?: boolean;
  isHiRes?: boolean;
  isDolbyAtmos?: boolean;
  isSpatialAudio?: boolean;
}

export interface NormalizedSong {
  id: string;
  source: MusicSource;
  title: string;
  artist: NormalizedArtist;
  album?: NormalizedAlbum;
  duration: number; // in seconds
  lyrics?: string | null;
  audio: {
    url: string;
    mimeType?: string;
    expiresAt?: string | null;
  };
  images: {
    thumbnail?: string | null;
    cover?: string | null;
  };
  audioQuality?: AudioQuality;
}

export interface MusicSearchResult {
  query: string;
  items: NormalizedSong[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
  providers: Record<string, { success: boolean; error?: string }>;
}

export interface MusicLyricsResult {
  songId: string;
  source: MusicSource;
  lyrics: string | null;
  provider?: 'local' | 'jiosaavn' | 'lrclib';
  isFallback?: boolean;
}

export interface MusicStreamResult {
  songId: string;
  source: MusicSource;
  url: string;
  mimeType: string;
  expiresAt?: string | null;
}

export interface SearchParams {
  q?: string;
  source?: 'local' | 'jiosaavn' | 'all';
  page?: number;
  limit?: number;
  artist?: string;
  album?: string;
  genre?: string;
}

export interface MusicProvider {
  name: MusicSource;
  search(params: SearchParams): Promise<NormalizedSong[]>;
  getSong(id: string): Promise<NormalizedSong | null>;
  getLyrics(id: string): Promise<MusicLyricsResult | null>;
  getStream(id: string): Promise<MusicStreamResult | null>;
}
