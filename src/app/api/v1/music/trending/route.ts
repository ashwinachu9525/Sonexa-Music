import { NextResponse } from 'next/server';
import { musicOrchestrator } from '@/lib/orchestrator/orchestrator';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || searchParams.get('lang') || 'hindi';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const songs = await musicOrchestrator.getTrendingSongs(language, limit);

    return NextResponse.json({
      success: true,
      language: language.toLowerCase(),
      total: songs.length,
      data: songs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch trending songs by language' },
      { status: 500 }
    );
  }
}
