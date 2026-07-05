import NodeCache from 'node-cache';

// Initialize cache with 5-minute standard TTL and 10-minute check period
const cache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

/**
 * Higher-order function to wrap async route handlers with caching.
 * @param key The cache key
 * @param fn The original async function
 */
export const withCache = (key: string, fn: Function) => {
  return async (req: any, res: any, next: any) => {
    try {
      const cachedData = cache.get(key);
      if (cachedData) {
        console.log(`[Cache] Hit: ${key}`);
        return res.json(cachedData);
      }

      // Execute original function and capture result
      // Note: This is a simple implementation. For complex routes, 
      // intercepting res.json is better, but for these specific reports, 
      // we'll use a direct approach in the routes.
      return await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Clears cache keys that start with the given pattern.
 * @param pattern The prefix to search for (e.g., 'report_')
 */
export const clearCachePattern = (pattern: string) => {
  const keys = cache.keys();
  const keysToDelete = keys.filter(k => k.startsWith(pattern));
  if (keysToDelete.length > 0) {
    cache.del(keysToDelete);
    console.log(`[Cache] Invalidated ${keysToDelete.length} keys for pattern: ${pattern}`);
  }
};

export default cache;
