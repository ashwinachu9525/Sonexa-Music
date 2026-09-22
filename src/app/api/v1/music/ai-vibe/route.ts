import { NextResponse } from 'next/server';
import { aiVibeEngine } from '@/lib/orchestrator/aiVibeEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { prompt, moodId, limit } = body;

    const result = await aiVibeEngine.generateVibePlaylist({
      prompt: typeof prompt === 'string' ? prompt : undefined,
      moodId: typeof moodId === 'string' ? moodId : undefined,
      limit: typeof limit === 'number' ? limit : 15,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to generate AI Vibe playlist',
      },
      { status: 500 }
    );
  }
}
