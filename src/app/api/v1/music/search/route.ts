import { NextResponse } from 'next/server';
import { musicOrchestrator } from '@/lib/orchestrator/orchestrator';
import { MusicSource } from '@/lib/orchestrator/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || searchParams.get('search') || '';
    const sourceParam = searchParams.get('source') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let source: 'local' | 'jiosaavn' | 'all' = 'all';
    if (sourceParam === 'local' || sourceParam === 'jiosaavn') {
      source = sourceParam;
    }

    const result = await musicOrchestrator.search({
      q,
      source,
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 20 : limit,
      artist: searchParams.get('artist') || undefined,
      album: searchParams.get('album') || undefined,
      genre: searchParams.get('genre') || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to execute music search',
      },
      { status: 500 }
    );
  }
}
