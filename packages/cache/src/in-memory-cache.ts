import NodeCache = require('node-cache');
import { Brand, Flavor, Line } from '@hookah-db/types';
import { ICache, CacheStats } from './types';

const DEFAULT_TTL = 86400; // 24 hours in seconds

export class InMemoryCache implements ICache {
  private cache: NodeCache;
  private hits: number = 0;
  private misses: number = 0;

  constructor(options?: { defaultTTL?: number; checkperiod?: number }) {
    const defaultTTL = options?.defaultTTL ?? DEFAULT_TTL;
    this.cache = new NodeCache({
      stdTTL: defaultTTL,
      checkperiod: options?.checkperiod ?? 600, // Check for expired keys every 10 minutes
      useClones: false, // Performance optimization
    });
  }

  // Generic methods
  get<T>(key: string): T | null {
    const value = this.cache.get<T>(key);
    if (value === undefined) {
      this.misses++;
      return null;
    }
    this.hits++;
    return value;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    if (ttl !== undefined) {
      this.cache.set(key, value, ttl);
    } else {
      this.cache.set(key, value);
    }
  }

  delete(key: string): boolean {
    return this.cache.del(key) > 0;
  }

  clear(): void {
    this.cache.flushAll();
    this.hits = 0;
    this.misses = 0;
  }

  // Brand-specific methods
  getBrand(slug: string): Brand | null {
    return this.get<Brand>(`brand:${slug}`);
  }

  setBrand(brand: Brand, ttl?: number): void {
    this.set(`brand:${brand.slug}`, brand, ttl);
  }

  getBrands(): Brand[] {
    const brands = this.get<Brand[]>('brands:all');
    return brands ?? [];
  }

  setBrands(brands: Brand[], ttl?: number): void {
    this.set('brands:all', brands, ttl);
  }

  // Flavor-specific methods
  getFlavor(slug: string): Flavor | null {
    return this.get<Flavor>(`flavor:${slug}`);
  }

  setFlavor(flavor: Flavor, ttl?: number): void {
    this.set(`flavor:${flavor.slug}`, flavor, ttl);
  }

  getFlavors(): Flavor[] {
    const flavors = this.get<Flavor[]>('flavors:all');
    return flavors ?? [];
  }

  setFlavors(flavors: Flavor[], ttl?: number): void {
    this.set('flavors:all', flavors, ttl);
  }

  getFlavorsByBrand(brandSlug: string): Flavor[] {
    const flavors = this.get<Flavor[]>(`flavors:brand:${brandSlug}`);
    return flavors ?? [];
  }

  setFlavorsByBrand(brandSlug: string, flavors: Flavor[], ttl?: number): void {
    this.set(`flavors:brand:${brandSlug}`, flavors, ttl);
  }

  // Line-specific methods
  getLine(slug: string): Line | null {
    return this.get<Line>(`line:${slug}`);
  }

  setLine(line: Line, ttl?: number): void {
    this.set(`line:${line.slug}`, line, ttl);
  }

  // Cache statistics
  getStats(): CacheStats {
    return {
      keys: this.cache.keys().length,
      hits: this.hits,
      misses: this.misses,
      size: this.cache.getStats().keys,
    };
  }
}
