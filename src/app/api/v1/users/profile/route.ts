import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        profileImage: true,
        gender: true,
        preferredLanguage: true,
        role: true,
        createdAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    logger.error({ err: error, email }, 'Error fetching user profile');
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { verifyToken } = await import('@/lib/jwt');
    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);
    
    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { email, displayName, gender, preferredLanguage, profileImage } = body;

    if (!email || email !== payload.email) {
      return NextResponse.json({ error: 'Email is required and must match token' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        displayName: displayName !== undefined ? displayName : undefined,
        gender: gender !== undefined ? gender : undefined,
        preferredLanguage: preferredLanguage !== undefined ? preferredLanguage : undefined,
        profileImage: profileImage !== undefined ? profileImage : undefined,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        profileImage: true,
        gender: true,
        preferredLanguage: true,
        role: true,
        createdAt: true,
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    logger.error({ err: error }, 'Error updating user profile');
    return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { verifyToken } = await import('@/lib/jwt');
    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);
    
    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Delete user from database
    await prisma.user.delete({
      where: { email: payload.email }
    });

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    logger.error({ err: error }, 'Error deleting account');
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
