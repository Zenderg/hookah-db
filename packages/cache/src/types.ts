import { Brand, Flavor, Line } from '@hookah-db/types';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface ICache {
  // Generic methods
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): boolean;
  clear(): void;
  
  // Brand-specific methods
  getBrand(slug: string): Brand | null;
  setBrand(brand: Brand, ttl?: number): void;
  getBrands(): Brand[];
  setBrands(brands: Brand[], ttl?: number): void;
  
  // Flavor-specific methods
  getFlavor(slug: string): Flavor | null;
  setFlavor(flavor: Flavor, ttl?: number): void;
  getFlavors(): Flavor[];
  setFlavors(flavors: Flavor[], ttl?: number): void;
  getFlavorsByBrand(brandSlug: string): Flavor[];
  
  // Line-specific methods
  getLine(slug: string): Line | null;
  setLine(line: Line, ttl?: number): void;
  
  // Cache statistics
  getStats(): CacheStats;
}

export interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
  size: number;
}
