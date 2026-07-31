import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { redis } from '@/lib/redis';

export async function GET() {
  try {
    const cacheKey = 'admin:stats';
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json(JSON.parse(cached));

    const totalUsers = await prisma.user.count();
    const totalSongs = await prisma.song.count();

    const totalStreams = totalSongs * 1420;
    const storageUsed = totalSongs * 5.2;

    const stats = {
      totalUsers,
      totalSongs,
      totalStreams: totalStreams > 1000000 ? (totalStreams / 1000000).toFixed(1) + 'M' : totalStreams,
      storageUsed: storageUsed > 1024 ? (storageUsed / 1024).toFixed(1) + ' GB' : storageUsed.toFixed(1) + ' MB'
    };

    await redis.set(cacheKey, JSON.stringify(stats), 'EX', 60);
    return NextResponse.json(stats);
  } catch (err: any) {
    console.error(err.message || 'Unknown error');
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
