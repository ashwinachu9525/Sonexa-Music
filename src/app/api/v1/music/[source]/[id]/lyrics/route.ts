import { NextResponse } from 'next/server';
import { musicOrchestrator } from '@/lib/orchestrator/orchestrator';
import { MusicSource } from '@/lib/orchestrator/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ source: string; id: string }> }
) {
  try {
    const { source, id } = await params;

    if (source !== 'local' && source !== 'jiosaavn') {
      return NextResponse.json(
        { success: false, error: "Invalid music source. Must be 'local' or 'jiosaavn'." },
        { status: 400 }
      );
    }

    const lyricsResult = await musicOrchestrator.getLyrics(source as MusicSource, id);

    if (!lyricsResult) {
      return NextResponse.json({
        success: true,
        data: {
          songId: id,
          source: source as MusicSource,
          lyrics: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: lyricsResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch lyrics' },
      { status: 500 }
    );
  }
}
