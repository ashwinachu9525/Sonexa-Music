import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

// Helper to generate a random 6-character alphanumeric code
function generateDeviceCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST() {
  try {
    const code = generateDeviceCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const pairing = await prisma.devicePairing.create({
      data: {
        code,
        expiresAt,
      }
    });

    return NextResponse.json({ code: pairing.code, expiresAt: pairing.expiresAt });
  } catch (error: any) {
    logger.error({ err: error }, 'Generate device code error');
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
  }
}
