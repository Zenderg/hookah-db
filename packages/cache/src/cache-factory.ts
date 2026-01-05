import { ICache } from './types';
import { InMemoryCache } from './in-memory-cache';

export type CacheType = 'memory' | 'redis';

export interface CacheConfig {
  type: CacheType;
  defaultTTL?: number;
  redisUrl?: string;
}

export function createCache(config: CacheConfig): ICache {
  switch (config.type) {
    case 'memory':
      return new InMemoryCache({
        defaultTTL: config.defaultTTL,
      });
    case 'redis':
      throw new Error('Redis cache implementation is not yet available');
    default:
      throw new Error(`Unknown cache type: ${config.type}`);
  }
}
