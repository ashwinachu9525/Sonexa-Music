import { redis } from './redis';

const pendingPromises = new Map<string, Promise<any>>();

/**
 * Fetch from cache or compute if missing, with stampede prevention.
 * @param key Cache key
 * @param ttlSeconds Time-to-live in seconds
 * @param fetcher Function to compute the data if missing
 */
export async function getOrComputeCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  // Stampede prevention: deduplicate concurrent requests for the same key
  if (pendingPromises.has(key)) {
    return pendingPromises.get(key) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const result = await fetcher();
      if (result !== undefined && result !== null) {
        await redis.set(key, JSON.stringify(result), 'EX', ttlSeconds);
      }
      return result;
    } finally {
      pendingPromises.delete(key);
    }
  })();

  pendingPromises.set(key, promise);
  return promise;
}

/**
 * Safely clear cache keys matching a specific prefix without flushing the entire DB.
 * Uses SCAN to handle large numbers of keys without blocking Redis.
 * @param prefix The key prefix to clear (e.g. "users:*", "app:*")
 */
export async function clearCacheByPrefix(prefix: string): Promise<number> {
  let cursor = '0';
  let totalDeleted = 0;
  
  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
    cursor = newCursor;
    
    if (keys.length > 0) {
      await redis.del(...keys);
      totalDeleted += keys.length;
    }
  } while (cursor !== '0');
  
  return totalDeleted;
}
