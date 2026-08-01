import prisma from './src/lib/db';
import { redis } from './src/lib/redis';

async function test() {
  try {
    console.log("Testing DB...");
    const users = await prisma.user.count();
    console.log("DB SUCCESS! Users:", users);
  } catch(e) {
    console.error("DB FAIL!", e);
  }

  try {
    console.log("Testing Redis...");
    await redis.ping();
    console.log("Redis SUCCESS!");
  } catch(e) {
    console.error("Redis FAIL!", e);
  } finally {
    process.exit(0);
  }
}

test();
