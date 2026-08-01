import { redis } from './redis';
import { logger } from './logger';

export async function rateLimit(
  identifier: string,
  limit: number = 100,
  windowInSeconds: number = 60
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  try {
    const key = `rate_limit:${identifier}`;
    
    // Increment counter
    const currentCount = await redis.incr(key);
    
    // Set expiry if it's a new window
    if (currentCount === 1) {
      await redis.expire(key, windowInSeconds);
    }

    const ttl = await redis.ttl(key);
    const resetTime = Date.now() + (ttl * 1000);

    return {
      success: currentCount <= limit,
      limit,
      remaining: Math.max(0, limit - currentCount),
      reset: resetTime,
    };
  } catch (error) {
    logger.error({ err: error, identifier }, 'Rate limit error, allowing request to pass');
    // Fail open in case of Redis issues
    return { success: true, limit, remaining: limit, reset: Date.now() };
  }
}
