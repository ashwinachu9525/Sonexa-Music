import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { redis } from '@/lib/redis';

import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { email, otp } = data;

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    // Retrieve payload from Redis
    const payloadStr = await redis.get(`auth:otp:${email}`);
    if (!payloadStr) {
      return NextResponse.json({ error: 'OTP expired or not found' }, { status: 400 });
    }

    const payload = JSON.parse(payloadStr);

    if (payload.otp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // OTP is valid. Delete it from Redis to prevent reuse.
    await redis.del(`auth:otp:${email}`);

    // Hash password
    const hashedPassword = payload.password ? await bcrypt.hash(payload.password, 10) : undefined;

    // Create or Update User in Database
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        displayName: payload.name || undefined,
        gender: payload.gender || undefined,
        preferredLanguage: payload.language || undefined,
      },
      create: {
        email,
        password: hashedPassword,
        displayName: payload.name,
        gender: payload.gender,
        preferredLanguage: payload.language,
      },
    });

    // In a real production app, you would generate and return a JWT session token here.
    // For this implementation, returning the user object acts as successful authentication.
    return NextResponse.json({ 
      message: 'Verification successful',
      user 
    });

  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
