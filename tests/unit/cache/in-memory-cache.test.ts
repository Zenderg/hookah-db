import { InMemoryCache } from '../../src/cache';
import { Brand, Flavor, Line } from '../../src/types';

describe('InMemoryCache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Generic methods', () => {
    describe('get<T>()', () => {
      it('should return null for non-existent key', () => {
        const result = cache.get<string>('nonexistent');
        expect(result).toBeNull();
      });

      it('should increment misses for non-existent key', () => {
        cache.get<string>('nonexistent');
        const stats = cache.getStats();
        expect(stats.misses).toBe(1);
      });

      it('should return value for existing key', () => {
        cache.set('test-key', 'test-value');
        const result = cache.get<string>('test-key');
        expect(result).toBe('test-value');
      });

      it('should increment hits for existing key', () => {
        cache.set('test-key', 'test-value');
        cache.get<string>('test-key');
        const stats = cache.getStats();
        expect(stats.hits).toBe(1);
      });

      it('should return complex objects', () => {
        const obj = { name: 'test', value: 123 };
        cache.set('obj-key', obj);
        const result = cache.get<typeof obj>('obj-key');
        expect(result).toEqual(obj);
      });
    });

    describe('set<T>()', () => {
      it('should store value with default TTL', () => {
        cache.set('test-key', 'test-value');
        const result = cache.get<string>('test-key');
        expect(result).toBe('test-value');
      });

      it('should store value with custom TTL', () => {
        cache.set('test-key', 'test-value', 60);
        const result = cache.get<string>('test-key');
        expect(result).toBe('test-value');
      });

      it('should overwrite existing value', () => {
        cache.set('test-key', 'value1');
        cache.set('test-key', 'value2');
        const result = cache.get<string>('test-key');
        expect(result).toBe('value2');
      });

      it('should store null values', () => {
        cache.set('null-key', null);
        const result = cache.get<null>('null-key');
        expect(result).toBeNull();
      });

      it('should treat undefined values as not in cache', () => {
        cache.set('undefined-key', undefined);
        const result = cache.get<undefined>('undefined-key');
        expect(result).toBeNull();
      });
    });

    describe('delete()', () => {
      it('should return false for non-existent key', () => {
        const result = cache.delete('nonexistent');
        expect(result).toBe(false);
      });

      it('should return true for existing key', () => {
        cache.set('test-key', 'test-value');
        const result = cache.delete('test-key');
        expect(result).toBe(true);
      });

      it('should remove value from cache', () => {
        cache.set('test-key', 'test-value');
        cache.delete('test-key');
        const result = cache.get<string>('test-key');
        expect(result).toBeNull();
      });
    });

    describe('clear()', () => {
      it('should remove all values from cache', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');
        
        cache.clear();
        
        expect(cache.get<string>('key1')).toBeNull();
        expect(cache.get<string>('key2')).toBeNull();
        expect(cache.get<string>('key3')).toBeNull();
      });

      it('should reset hit counter', () => {
        cache.set('key', 'value');
        cache.get<string>('key');
        cache.clear();
        
        const stats = cache.getStats();
        expect(stats.hits).toBe(0);
      });

      it('should reset miss counter', () => {
        cache.get<string>('nonexistent');
        cache.clear();
        
        const stats = cache.getStats();
        expect(stats.misses).toBe(0);
      });
    });
  });

  describe('Brand-specific methods', () => {
    let mockBrand: Brand;

    beforeEach(() => {
      mockBrand = {
        slug: 'sarma',
        name: 'Сарма',
        nameEn: 'Sarma',
        description: 'Test brand description',
        country: 'Россия',
        website: 'https://example.com',
        foundedYear: 2010,
        status: 'Выпускается',
        imageUrl: 'https://example.com/image.jpg',
        rating: 4.5,
        ratingsCount: 100,
        reviewsCount: 50,
        viewsCount: 1000,
        lines: [],
        flavors: [],
      };
    });

    describe('getBrand()', () => {
      it('should return null for non-existent brand', () => {
        const result = cache.getBrand('nonexistent');
        expect(result).toBeNull();
      });

      it('should return brand for existing slug', () => {
        cache.setBrand(mockBrand);
        const result = cache.getBrand('sarma');
        expect(result).toEqual(mockBrand);
      });

      it('should increment misses for non-existent brand', () => {
        cache.getBrand('nonexistent');
        const stats = cache.getStats();
        expect(stats.misses).toBe(1);
      });

      it('should increment hits for existing brand', () => {
        cache.setBrand(mockBrand);
        cache.getBrand('sarma');
        const stats = cache.getStats();
        expect(stats.hits).toBe(1);
      });
    });

    describe('setBrand()', () => {
      it('should store brand with default TTL', () => {
        cache.setBrand(mockBrand);
        const result = cache.getBrand('sarma');
        expect(result).toEqual(mockBrand);
      });

      it('should store brand with custom TTL', () => {
        cache.setBrand(mockBrand, 60);
        const result = cache.getBrand('sarma');
        expect(result).toEqual(mockBrand);
      });

      it('should use brand slug as key', () => {
        cache.setBrand(mockBrand);
        const result = cache.getBrand(mockBrand.slug);
        expect(result).toEqual(mockBrand);
      });
    });

    describe('getBrands()', () => {
      it('should return empty array when no brands cached', () => {
        const result = cache.getBrands();
        expect(result).toEqual([]);
      });

      it('should return cached brands array', () => {
        const brands = [mockBrand];
        cache.setBrands(brands);
        const result = cache.getBrands();
        expect(result).toEqual(brands);
      });

      it('should return empty array for null cache value', () => {
        cache.set('brands:all', null);
        const result = cache.getBrands();
        expect(result).toEqual([]);
      });
    });

    describe('setBrands()', () => {
      it('should store brands array with default TTL', () => {
        const brands = [mockBrand];
        cache.setBrands(brands);
        const result = cache.getBrands();
        expect(result).toEqual(brands);
      });

      it('should store brands array with custom TTL', () => {
        const brands = [mockBrand];
        cache.setBrands(brands, 60);
        const result = cache.getBrands();
        expect(result).toEqual(brands);
      });

      it('should store empty array', () => {
        cache.setBrands([]);
        const result = cache.getBrands();
        expect(result).toEqual([]);
      });
    });
  });

  describe('Flavor-specific methods', () => {
    let mockFlavor: Flavor;

    beforeEach(() => {
      mockFlavor = {
        slug: 'zima',
        name: 'Зима',
        nameAlt: null,
        description: 'Test flavor description',
        brandSlug: 'sarma',
        brandName: 'Сарма',
        lineSlug: 'klassicheskaya',
        lineName: 'Классическая',
        country: 'Россия',
        officialStrength: 'Средняя',
        userStrength: 'Средняя',
        status: 'Выпускается',
        imageUrl: 'https://example.com/flavor.jpg',
        tags: ['Холодок'],
        rating: 4.5,
        ratingsCount: 50,
        reviewsCount: 25,
        viewsCount: 500,
        ratingDistribution: {
          count1: 0,
          count2: 1,
          count3: 5,
          count4: 15,
          count5: 29,
        },
        smokeAgainPercentage: 85,
        htreviewsId: 12345,
        dateAdded: new Date('2024-01-01'),
        addedBy: 'testuser',
      };
    });

    describe('getFlavor()', () => {
      it('should return null for non-existent flavor', () => {
        const result = cache.getFlavor('nonexistent');
        expect(result).toBeNull();
      });

      it('should return flavor for existing slug', () => {
        cache.setFlavor(mockFlavor);
        const result = cache.getFlavor('zima');
        expect(result).toEqual(mockFlavor);
      });

      it('should increment misses for non-existent flavor', () => {
        cache.getFlavor('nonexistent');
        const stats = cache.getStats();
        expect(stats.misses).toBe(1);
      });

      it('should increment hits for existing flavor', () => {
        cache.setFlavor(mockFlavor);
        cache.getFlavor('zima');
        const stats = cache.getStats();
        expect(stats.hits).toBe(1);
      });
    });

    describe('setFlavor()', () => {
      it('should store flavor with default TTL', () => {
        cache.setFlavor(mockFlavor);
        const result = cache.getFlavor('zima');
        expect(result).toEqual(mockFlavor);
      });

      it('should store flavor with custom TTL', () => {
        cache.setFlavor(mockFlavor, 60);
        const result = cache.getFlavor('zima');
        expect(result).toEqual(mockFlavor);
      });

      it('should use flavor slug as key', () => {
        cache.setFlavor(mockFlavor);
        const result = cache.getFlavor(mockFlavor.slug);
        expect(result).toEqual(mockFlavor);
      });
    });

    describe('getFlavors()', () => {
      it('should return empty array when no flavors cached', () => {
        const result = cache.getFlavors();
        expect(result).toEqual([]);
      });

      it('should return cached flavors array', () => {
        const flavors = [mockFlavor];
        cache.setFlavors(flavors);
        const result = cache.getFlavors();
        expect(result).toEqual(flavors);
      });

      it('should return empty array for null cache value', () => {
        cache.set('flavors:all', null);
        const result = cache.getFlavors();
        expect(result).toEqual([]);
      });
    });

    describe('setFlavors()', () => {
      it('should store flavors array with default TTL', () => {
        const flavors = [mockFlavor];
        cache.setFlavors(flavors);
        const result = cache.getFlavors();
        expect(result).toEqual(flavors);
      });

      it('should store flavors array with custom TTL', () => {
        const flavors = [mockFlavor];
        cache.setFlavors(flavors, 60);
        const result = cache.getFlavors();
        expect(result).toEqual(flavors);
      });

      it('should store empty array', () => {
        cache.setFlavors([]);
        const result = cache.getFlavors();
        expect(result).toEqual([]);
      });
    });

    describe('getFlavorsByBrand()', () => {
      it('should return empty array when no flavors cached for brand', () => {
        const result = cache.getFlavorsByBrand('sarma');
        expect(result).toEqual([]);
      });

      it('should return cached flavors for brand', () => {
        const flavors = [mockFlavor];
        (cache as any).setFlavorsByBrand('sarma', flavors);
        const result = cache.getFlavorsByBrand('sarma');
        expect(result).toEqual(flavors);
      });

      it('should return empty array for null cache value', () => {
        cache.set('flavors:brand:sarma', null);
        const result = cache.getFlavorsByBrand('sarma');
        expect(result).toEqual([]);
      });
    });

    describe('setFlavorsByBrand()', () => {
      it('should store brand flavors with default TTL', () => {
        const flavors = [mockFlavor];
        (cache as any).setFlavorsByBrand('sarma', flavors);
        const result = cache.getFlavorsByBrand('sarma');
        expect(result).toEqual(flavors);
      });

      it('should store brand flavors with custom TTL', () => {
        const flavors = [mockFlavor];
        (cache as any).setFlavorsByBrand('sarma', flavors, 60);
        const result = cache.getFlavorsByBrand('sarma');
        expect(result).toEqual(flavors);
      });

      it('should store empty array', () => {
        (cache as any).setFlavorsByBrand('sarma', []);
        const result = cache.getFlavorsByBrand('sarma');
        expect(result).toEqual([]);
      });
    });
  });

  describe('Line-specific methods', () => {
    let mockLine: Line;

    beforeEach(() => {
      mockLine = {
        slug: 'klassicheskaya',
        name: 'Классическая',
        description: 'Test line description',
        strength: 'Средняя',
        status: 'Выпускается',
        flavorsCount: 10,
        rating: 4.5,
        brandSlug: 'sarma',
      };
    });

    describe('getLine()', () => {
      it('should return null for non-existent line', () => {
        const result = cache.getLine('nonexistent');
        expect(result).toBeNull();
      });

      it('should return line for existing slug', () => {
        cache.setLine(mockLine);
        const result = cache.getLine('klassicheskaya');
        expect(result).toEqual(mockLine);
      });

      it('should increment misses for non-existent line', () => {
        cache.getLine('nonexistent');
        const stats = cache.getStats();
        expect(stats.misses).toBe(1);
      });

      it('should increment hits for existing line', () => {
        cache.setLine(mockLine);
        cache.getLine('klassicheskaya');
        const stats = cache.getStats();
        expect(stats.hits).toBe(1);
      });
    });

    describe('setLine()', () => {
      it('should store line with default TTL', () => {
        cache.setLine(mockLine);
        const result = cache.getLine('klassicheskaya');
        expect(result).toEqual(mockLine);
      });

      it('should store line with custom TTL', () => {
        cache.setLine(mockLine, 60);
        const result = cache.getLine('klassicheskaya');
        expect(result).toEqual(mockLine);
      });

      it('should use line slug as key', () => {
        cache.setLine(mockLine);
        const result = cache.getLine(mockLine.slug);
        expect(result).toEqual(mockLine);
      });
    });
  });

  describe('Cache statistics', () => {
    describe('getStats()', () => {
      it('should return zero stats for new cache', () => {
        const stats = cache.getStats();
        expect(stats.keys).toBe(0);
        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
        expect(stats.size).toBe(0);
      });

      it('should track number of keys', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');
        
        const stats = cache.getStats();
        expect(stats.keys).toBe(3);
      });

      it('should track hits', () => {
        cache.set('key', 'value');
        cache.get<string>('key');
        cache.get<string>('key');
        
        const stats = cache.getStats();
        expect(stats.hits).toBe(2);
      });

      it('should track misses', () => {
        cache.get<string>('nonexistent1');
        cache.get<string>('nonexistent2');
        
        const stats = cache.getStats();
        expect(stats.misses).toBe(2);
      });

      it('should track size correctly', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        
        const stats = cache.getStats();
        expect(stats.size).toBe(2);
      });

      it('should reset stats after clear', () => {
        cache.set('key', 'value');
        cache.get<string>('key');
        cache.get<string>('nonexistent');
        
        cache.clear();
        
        const stats = cache.getStats();
        expect(stats.keys).toBe(0);
        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
        expect(stats.size).toBe(0);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings as keys', () => {
      cache.set('', 'value');
      const result = cache.get<string>('');
      expect(result).toBe('value');
    });

    it('should handle special characters in keys', () => {
      cache.set('key:with:special:chars', 'value');
      const result = cache.get<string>('key:with:special:chars');
      expect(result).toBe('value');
    });

    it('should handle very long keys', () => {
      const longKey = 'a'.repeat(1000);
      cache.set(longKey, 'value');
      const result = cache.get<string>(longKey);
      expect(result).toBe('value');
    });

    it('should handle storing and retrieving large objects', () => {
      const largeObj = {
        data: 'x'.repeat(10000),
        nested: {
          array: Array(100).fill('item'),
        },
      };
      cache.set('large-key', largeObj);
      const result = cache.get<typeof largeObj>('large-key');
      expect(result).toEqual(largeObj);
    });

    it('should handle storing and retrieving arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      cache.set('array-key', arr);
      const result = cache.get<number[]>('array-key');
      expect(result).toEqual(arr);
    });

    it('should handle storing and retrieving dates', () => {
      const date = new Date('2024-01-01');
      cache.set('date-key', date);
      const result = cache.get<Date>('date-key');
      expect(result).toEqual(date);
    });
  });

  describe('Key prefixing', () => {
    it('should use brand: prefix for brand keys', () => {
      const brand: Brand = {
        slug: 'test',
        name: 'Test',
        nameEn: 'Test',
        description: '',
        country: '',
        website: '',
        foundedYear: 2020,
        status: 'Выпускается',
        imageUrl: '',
        rating: 0,
        ratingsCount: 0,
        reviewsCount: 0,
        viewsCount: 0,
        lines: [],
        flavors: [],
      };
      
      cache.setBrand(brand);
      
      // Should not conflict with generic key
      cache.set('test', 'generic-value');
      
      const brandResult = cache.getBrand('test');
      const genericResult = cache.get<string>('test');
      
      expect(brandResult).toEqual(brand);
      expect(genericResult).toBe('generic-value');
    });

    it('should use flavor: prefix for flavor keys', () => {
      const flavor: Flavor = {
        slug: 'test',
        name: 'Test',
        nameAlt: null,
        description: '',
        brandSlug: 'test-brand',
        brandName: 'Test Brand',
        lineSlug: 'test-line',
        lineName: 'Test Line',
        country: '',
        officialStrength: 'Средняя',
        userStrength: 'Средняя',
        status: 'Выпускается',
        imageUrl: '',
        tags: [],
        rating: 0,
        ratingsCount: 0,
        reviewsCount: 0,
        viewsCount: 0,
        ratingDistribution: {
          count1: 0,
          count2: 0,
          count3: 0,
          count4: 0,
          count5: 0,
        },
        smokeAgainPercentage: 0,
        htreviewsId: 0,
        dateAdded: new Date(),
        addedBy: '',
      };
      
      cache.setFlavor(flavor);
      
      // Should not conflict with generic key
      cache.set('test', 'generic-value');
      
      const flavorResult = cache.getFlavor('test');
      const genericResult = cache.get<string>('test');
      
      expect(flavorResult).toEqual(flavor);
      expect(genericResult).toBe('generic-value');
    });

    it('should use line: prefix for line keys', () => {
      const line: Line = {
        slug: 'test',
        name: 'Test',
        description: '',
        strength: 'Средняя',
        status: 'Выпускается',
        flavorsCount: 0,
        rating: 0,
        brandSlug: 'test-brand',
      };
      
      cache.setLine(line);
      
      // Should not conflict with generic key
      cache.set('test', 'generic-value');
      
      const lineResult = cache.getLine('test');
      const genericResult = cache.get<string>('test');
      
      expect(lineResult).toEqual(line);
      expect(genericResult).toBe('generic-value');
    });
  });

  describe('TTL functionality', () => {
    beforeEach(() => {
      // Create cache with very short TTL for testing
      cache = new InMemoryCache({ defaultTTL: 0.5 }); // 0.5 seconds
    });

    it('should expire entries after TTL', (done) => {
      cache.set('test-key', 'test-value');
      
      setTimeout(() => {
        const result = cache.get<string>('test-key');
        expect(result).toBeNull();
        done();
      }, 600); // Wait for TTL + small buffer
    });

    it('should respect custom TTL', (done) => {
      cache.set('short-key', 'value', 0.3); // 0.3 seconds
      cache.set('long-key', 'value', 2); // 2 seconds
      
      setTimeout(() => {
        const shortResult = cache.get<string>('short-key');
        const longResult = cache.get<string>('long-key');
        
        expect(shortResult).toBeNull();
        expect(longResult).not.toBeNull();
        done();
      }, 400); // Wait for short TTL to expire
    });

    it('should not expire before TTL', (done) => {
      cache.set('test-key', 'test-value');
      
      setTimeout(() => {
        const result = cache.get<string>('test-key');
        expect(result).toBe('test-value');
        done();
      }, 200); // Wait less than TTL
    });
  });
});
