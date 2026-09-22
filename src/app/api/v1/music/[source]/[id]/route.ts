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

    const song = await musicOrchestrator.getSong(source as MusicSource, id);

    if (!song) {
      return NextResponse.json(
        { success: false, error: `Song not found in provider '${source}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: song,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch song details' },
      { status: 500 }
    );
  }
}
