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

    // Mock chart data for daily streams over the last 7 days
    const chartData = [
      { name: 'Mon', value: Math.floor(Math.random() * 5000) + 1000 },
      { name: 'Tue', value: Math.floor(Math.random() * 5000) + 1000 },
      { name: 'Wed', value: Math.floor(Math.random() * 5000) + 1000 },
      { name: 'Thu', value: Math.floor(Math.random() * 5000) + 1000 },
      { name: 'Fri', value: Math.floor(Math.random() * 8000) + 3000 },
      { name: 'Sat', value: Math.floor(Math.random() * 10000) + 5000 },
      { name: 'Sun', value: Math.floor(Math.random() * 9000) + 4000 },
    ];

    const stats = {
      totalUsers,
      totalSongs,
      totalStreams: totalStreams > 1000000 ? (totalStreams / 1000000).toFixed(1) + 'M' : totalStreams,
      storageUsed: storageUsed > 1024 ? (storageUsed / 1024).toFixed(1) + ' GB' : storageUsed.toFixed(1) + ' MB',
      chartData
    };

    await redis.set(cacheKey, JSON.stringify(stats), 'EX', 60);
    return NextResponse.json(stats);
  } catch (err: any) {
    console.error(err.message || 'Unknown error');
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
