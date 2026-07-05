"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCachePattern = exports.withCache = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
// Initialize cache with 5-minute standard TTL and 10-minute check period
const cache = new node_cache_1.default({ stdTTL: 300, checkperiod: 600 });
/**
 * Higher-order function to wrap async route handlers with caching.
 * @param key The cache key
 * @param fn The original async function
 */
const withCache = (key, fn) => {
    return async (req, res, next) => {
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
        }
        catch (error) {
            next(error);
        }
    };
};
exports.withCache = withCache;
/**
 * Clears cache keys that start with the given pattern.
 * @param pattern The prefix to search for (e.g., 'report_')
 */
const clearCachePattern = (pattern) => {
    const keys = cache.keys();
    const keysToDelete = keys.filter(k => k.startsWith(pattern));
    if (keysToDelete.length > 0) {
        cache.del(keysToDelete);
        console.log(`[Cache] Invalidated ${keysToDelete.length} keys for pattern: ${pattern}`);
    }
};
exports.clearCachePattern = clearCachePattern;
exports.default = cache;
