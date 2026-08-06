import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    // Expecting Bearer token in headers to authenticate the phone user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const upperCode = code.toUpperCase();
    const pairing = await prisma.devicePairing.findUnique({
      where: { code: upperCode }
    });

    if (!pairing) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 404 });
    }

    if (pairing.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Code expired' }, { status: 410 });
    }
    
    if (pairing.token) {
       return NextResponse.json({ error: 'Code already paired' }, { status: 400 });
    }

    // Pair the device by saving the token (or user ID, but token is simpler for the watch to just consume)
    await prisma.devicePairing.update({
      where: { code: upperCode },
      data: { token }
    });

    return NextResponse.json({ message: 'Device paired successfully' });
  } catch (error: any) {
    logger.error({ err: error }, 'Pair device error');
    return NextResponse.json({ error: 'Failed to pair device' }, { status: 500 });
  }
}
