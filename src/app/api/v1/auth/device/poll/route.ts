import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const pairing = await prisma.devicePairing.findUnique({
      where: { code }
    });

    if (!pairing) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 });
    }

    if (pairing.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Code expired', status: 'expired' }, { status: 410 });
    }

    if (pairing.token) {
      return NextResponse.json({ status: 'paired', token: pairing.token });
    } else {
      return NextResponse.json({ status: 'pending' });
    }
  } catch (error: any) {
    logger.error({ err: error }, 'Poll device code error');
    return NextResponse.json({ error: 'Failed to poll status' }, { status: 500 });
  }
}
