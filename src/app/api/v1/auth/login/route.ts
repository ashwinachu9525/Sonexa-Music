import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';
import { decryptPayload } from '@/lib/encryption';
import { generateToken } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const rawData = await request.json();
    
    let data = rawData;
    if (rawData.encryptedData) {
      const decryptedString = decryptPayload(rawData.encryptedData);
      if (decryptedString) {
        data = JSON.parse(decryptedString);
      } else {
        return NextResponse.json({ error: 'Failed to decrypt payload' }, { status: 400 });
      }
    }
    
    const { email, password } = data;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const limitResult = await rateLimit(`login:${email}:${ip}`, 5, 900); // 5 attempts per 15 mins
    
    if (!limitResult.success) {
      return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (!user.password) {
      return NextResponse.json({ error: 'Account was registered using a different provider. Please reset your password.' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await generateToken({ id: user.id, email: user.email });
    return NextResponse.json({ message: 'Login successful', user, token });
  } catch (error: any) {
    logger.error({ err: error }, 'Login error');
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
