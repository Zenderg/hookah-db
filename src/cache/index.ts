/**
 * Cache layer for hookah-db
 * This package provides caching implementations for the Hookah Tobacco Database API
 */

export type { ICache, CacheEntry, CacheStats } from './types';
export { InMemoryCache } from './in-memory-cache';
export { createCache } from './cache-factory';
export type { CacheType, CacheConfig } from './cache-factory';
