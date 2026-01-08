/**
 * Unit tests for BrandService
 * 
 * Tests BrandService functionality including:
 * - Constructor and initialization
 * - getAllBrands() method with caching
 * - getBrandBySlug() method with caching
 * - getBrandsByCountry() method
 * - refreshBrandCache() method
 * - Error handling and fallback behavior
 */

import { BrandService } from '../../src/services';
import { Brand } from '../../src/types';
import { ICache } from '../../src/cache';
import { scrapeBrandsList, scrapeBrandDetails } from '../../src/scraper';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock scraper functions
jest.mock('../../src/scraper', () => ({
  scrapeBrandsList: jest.fn(),
  scrapeBrandDetails: jest.fn(),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockBrand1: Brand = {
  slug: 'sarma',
  name: 'Сарма',
  nameEn: 'Sarma',
  description: 'Test brand description 1',
  country: 'Россия',
  website: 'https://sarma.com',
  foundedYear: 2010,
  status: 'Выпускается',
  imageUrl: 'https://example.com/sarma.jpg',
  rating: 4.5,
  ratingsCount: 100,
  reviewsCount: 50,
  viewsCount: 1000,
  lines: [],
  flavors: [],
};

const mockBrand2: Brand = {
  slug: 'dogma',
  name: 'Догма',
  nameEn: 'Dogma',
  description: 'Test brand description 2',
  country: 'Россия',
  website: 'https://dogma.com',
  foundedYear: 2015,
  status: 'Выпускается',
  imageUrl: 'https://example.com/dogma.jpg',
  rating: 4.6,
  ratingsCount: 200,
  reviewsCount: 100,
  viewsCount: 2000,
  lines: [],
  flavors: [],
};

const mockBrand3: Brand = {
  slug: 'tangiers',
  name: 'Tangiers',
  nameEn: 'Tangiers',
  description: 'Test brand description 3',
  country: 'США',
  website: 'https://tangiers.com',
  foundedYear: 2000,
  status: 'Выпускается',
  imageUrl: 'https://example.com/tangiers.jpg',
  rating: 4.3,
  ratingsCount: 300,
  reviewsCount: 150,
  viewsCount: 3000,
  lines: [],
  flavors: [],
};

const mockBrandSummaries = [
  {
    slug: 'sarma',
    name: 'Сарма',
    nameEn: 'Sarma',
    description: 'Test brand description 1',
    country: 'Россия',
    imageUrl: 'https://example.com/sarma.jpg',
    rating: 4.5,
    ratingsCount: 100,
    reviewsCount: 50,
    viewsCount: 1000,
  },
  {
    slug: 'dogma',
    name: 'Догма',
    nameEn: 'Dogma',
    description: 'Test brand description 2',
    country: 'Россия',
    imageUrl: 'https://example.com/dogma.jpg',
    rating: 4.6,
    ratingsCount: 200,
    reviewsCount: 100,
    viewsCount: 2000,
  },
  {
    slug: 'tangiers',
    name: 'Tangiers',
    nameEn: 'Tangiers',
    description: 'Test brand description 3',
    country: 'США',
    imageUrl: 'https://example.com/tangiers.jpg',
    rating: 4.3,
    ratingsCount: 300,
    reviewsCount: 150,
    viewsCount: 3000,
  },
];

// ============================================================================
// Test Suite
// ============================================================================

describe('BrandService', () => {
  let brandService: BrandService;
  let mockCache: jest.Mocked<ICache>;
  let mockBrandScraper: jest.MockedFunction<typeof scrapeBrandsList>;
  let mockBrandDetailsScraper: jest.MockedFunction<typeof scrapeBrandDetails>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock cache
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getBrand: jest.fn(),
      setBrand: jest.fn(),
      getBrands: jest.fn(),
      setBrands: jest.fn(),
      getFlavor: jest.fn(),
      setFlavor: jest.fn(),
      getFlavors: jest.fn(),
      setFlavors: jest.fn(),
      getFlavorsByBrand: jest.fn(),
      getLine: jest.fn(),
      setLine: jest.fn(),
      getStats: jest.fn(),
    };

    // Get mocked scraper functions
    mockBrandScraper = scrapeBrandsList as jest.MockedFunction<typeof scrapeBrandsList>;
    mockBrandDetailsScraper = scrapeBrandDetails as jest.MockedFunction<typeof scrapeBrandDetails>;

    // Create BrandService instance
    brandService = new BrandService(
      mockCache,
      mockBrandScraper,
      mockBrandDetailsScraper
    );
  });

  // ============================================================================
  // Constructor and Initialization Tests
  // ============================================================================

  describe('Constructor', () => {
    it('should initialize BrandService with dependencies', () => {
      expect(brandService).toBeInstanceOf(BrandService);
    });

    it('should store cache dependency', () => {
      // Access private property through type assertion
      const service = brandService as any;
      expect(service.cache).toBe(mockCache);
    });

    it('should store brandScraper dependency', () => {
      const service = brandService as any;
      expect(service.brandScraper).toBe(mockBrandScraper);
    });

    it('should store brandDetailsScraper dependency', () => {
      const service = brandService as any;
      expect(service.brandDetailsScraper).toBe(mockBrandDetailsScraper);
    });
  });

  // ============================================================================
  // getAllBrands() Tests
  // ============================================================================

  describe('getAllBrands', () => {
    describe('Cache Hit', () => {
      it('should return brands from cache when available', async () => {
        // Arrange
        const cachedBrands = [mockBrand1, mockBrand2];
        mockCache.getBrands.mockReturnValue(cachedBrands);

        // Act
        const result = await brandService.getAllBrands();

        // Assert
        expect(result).toEqual(cachedBrands);
        expect(mockCache.getBrands).toHaveBeenCalled();
        expect(mockBrandScraper).not.toHaveBeenCalled();
        expect(mockCache.setBrands).not.toHaveBeenCalled();
      });

      it('should not call scraper when cache has data', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([mockBrand1]);

        // Act
        await brandService.getAllBrands();

        // Assert
        expect(mockBrandScraper).not.toHaveBeenCalled();
      });

      it('should not update cache when returning cached data', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([mockBrand1]);

        // Act
        await brandService.getAllBrands();

        // Assert
        expect(mockCache.setBrands).not.toHaveBeenCalled();
      });
    });

    describe('Cache Miss', () => {
      it('should call scraper when cache is empty', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([]);
        mockBrandScraper.mockResolvedValue(mockBrandSummaries);

        // Act
        await brandService.getAllBrands();

        // Assert
        expect(mockBrandScraper).toHaveBeenCalled();
      });

      it('should call scraper when cache returns null', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue(null as any);
        mockBrandScraper.mockResolvedValue(mockBrandSummaries);

        // Act
        await brandService.getAllBrands();

        // Assert
        expect(mockBrandScraper).toHaveBeenCalled();
      });

      it('should cache scraped data with TTL', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([]);
        mockBrandScraper.mockResolvedValue(mockBrandSummaries);

        // Act
        await brandService.getAllBrands();

        // Assert
        expect(mockCache.setBrands).toHaveBeenCalledWith(
          expect.any(Array),
          86400 // 24 hours in seconds
        );
      });

      it('should convert BrandSummary to Brand objects', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([]);
        mockBrandScraper.mockResolvedValue(mockBrandSummaries);

        // Act
        const result = await brandService.getAllBrands();

        // Assert
        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({
          slug: 'sarma',
          name: 'Сарма',
          nameEn: 'Sarma',
          description: 'Test brand description 1',
          country: 'Россия',
          imageUrl: 'https://example.com/sarma.jpg',
          rating: 4.5,
          ratingsCount: 100,
          reviewsCount: 50,
          viewsCount: 1000,
        });
        expect(result[0].website).toBeNull();
        expect(result[0].foundedYear).toBeNull();
        expect(result[0].status).toBe('');
        expect(result[0].lines).toEqual([]);
        expect(result[0].flavors).toEqual([]);
      });

      it('should return scraped data', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([]);
        mockBrandScraper.mockResolvedValue(mockBrandSummaries);

        // Act
        const result = await brandService.getAllBrands();

        // Assert
        expect(result).toHaveLength(3);
        expect(result[0].slug).toBe('sarma');
        expect(result[1].slug).toBe('dogma');
        expect(result[2].slug).toBe('tangiers');
      });
    });

    describe('Force Refresh', () => {
      it('should bypass cache when forceRefresh is true', async () => {
        // Arrange
        const cachedBrands = [mockBrand1];
        mockCache.getBrands.mockReturnValue(cachedBrands);
        mockBrandScraper.mockResolvedValue(mockBrandSummaries);

        // Act
        await brandService.getAllBrands(true);

        // Assert
        expect(mockBrandScraper).toHaveBeenCalled();
      });

      it('should update cache when forceRefresh is true', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([mockBrand1]);
        mockBrandScraper.mockResolvedValue(mockBrandSummaries);

        // Act
        await brandService.getAllBrands(true);

        // Assert
        expect(mockCache.setBrands).toHaveBeenCalled();
      });

      it('should return fresh data when forceRefresh is true', async () => {
        // Arrange
        const cachedBrands = [mockBrand1];
        mockCache.getBrands.mockReturnValue(cachedBrands);
        mockBrandScraper.mockResolvedValue(mockBrandSummaries);

        // Act
        const result = await brandService.getAllBrands(true);

        // Assert
        expect(result).toHaveLength(3);
        expect(result[0].slug).toBe('sarma');
        expect(result[1].slug).toBe('dogma');
        expect(result[2].slug).toBe('tangiers');
      });
    });

    describe('Error Handling', () => {
      it('should fall back to stale cache on scraper error', async () => {
        // Arrange
        const cachedBrands = [mockBrand1, mockBrand2];
        mockCache.getBrands.mockReturnValueOnce([]).mockReturnValueOnce(cachedBrands);
        mockBrandScraper.mockRejectedValue(new Error('Network error'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        const result = await brandService.getAllBrands();

        // Assert
        expect(result).toEqual(cachedBrands);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to scrape brands list:', expect.any(Error));
        expect(consoleWarnSpy).toHaveBeenCalledWith('Returning stale cached brands data');

        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
      });

      it('should return empty array when scraper fails and no cache', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([]);
        mockBrandScraper.mockRejectedValue(new Error('Network error'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        const result = await brandService.getAllBrands();

        // Assert
        expect(result).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to scrape brands list:', expect.any(Error));

        consoleErrorSpy.mockRestore();
      });

      it('should log error when scraper fails', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([]);
        mockBrandScraper.mockRejectedValue(new Error('Test error'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        await brandService.getAllBrands();

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to scrape brands list:', expect.any(Error));

        consoleErrorSpy.mockRestore();
      });

      it('should handle empty scraped data', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([]);
        mockBrandScraper.mockResolvedValue([]);

        // Act
        const result = await brandService.getAllBrands();

        // Assert
        expect(result).toEqual([]);
        expect(mockCache.setBrands).toHaveBeenCalledWith([], 86400);
      });
    });
  });

  // ============================================================================
  // getBrandBySlug() Tests
  // ============================================================================

  describe('getBrandBySlug', () => {
    describe('Cache Hit', () => {
      it('should return brand from cache when available', async () => {
        // Arrange
        mockCache.getBrand.mockReturnValue(mockBrand1);

        // Act
        const result = await brandService.getBrandBySlug('sarma');

        // Assert
        expect(result).toEqual(mockBrand1);
        expect(mockCache.getBrand).toHaveBeenCalledWith('sarma');
        expect(mockBrandDetailsScraper).not.toHaveBeenCalled();
        expect(mockCache.setBrand).not.toHaveBeenCalled();
      });

      it('should not call scraper when cache has brand', async () => {
        // Arrange
        mockCache.getBrand.mockReturnValue(mockBrand1);

        // Act
        await brandService.getBrandBySlug('sarma');

        // Assert
        expect(mockBrandDetailsScraper).not.toHaveBeenCalled();
      });

      it('should not update cache when returning cached brand', async () => {
        // Arrange
        mockCache.getBrand.mockReturnValue(mockBrand1);

        // Act
        await brandService.getBrandBySlug('sarma');

        // Assert
        expect(mockCache.setBrand).not.toHaveBeenCalled();
      });
    });

    describe('Cache Miss', () => {
      it('should call scraper when cache miss', async () => {
        // Arrange
        mockCache.getBrand.mockReturnValue(null);
        mockBrandDetailsScraper.mockResolvedValue(mockBrand1);

        // Act
        await brandService.getBrandBySlug('sarma');

        // Assert
        expect(mockBrandDetailsScraper).toHaveBeenCalledWith('sarma');
      });

      it('should cache scraped brand with TTL', async () => {
        // Arrange
        mockCache.getBrand.mockReturnValue(null);
        mockBrandDetailsScraper.mockResolvedValue(mockBrand1);

        // Act
        await brandService.getBrandBySlug('sarma');

        // Assert
        expect(mockCache.setBrand).toHaveBeenCalledWith(
          mockBrand1,
          86400 // 24 hours in seconds
        );
      });

      it('should return scraped brand', async () => {
        // Arrange
        mockCache.getBrand.mockReturnValue(null);
        mockBrandDetailsScraper.mockResolvedValue(mockBrand1);

        // Act
        const result = await brandService.getBrandBySlug('sarma');

        // Assert
        expect(result).toEqual(mockBrand1);
      });

      it('should return null when scraper returns null', async () => {
        // Arrange
        mockCache.getBrand.mockReturnValue(null);
        mockBrandDetailsScraper.mockResolvedValue(null);

        // Act
        const result = await brandService.getBrandBySlug('nonexistent');

        // Assert
        expect(result).toBeNull();
      });

      it('should not cache when scraper returns null', async () => {
        // Arrange
        mockCache.getBrand.mockReturnValue(null);
        mockBrandDetailsScraper.mockResolvedValue(null);

        // Act
        await brandService.getBrandBySlug('nonexistent');

        // Assert
        expect(mockCache.setBrand).not.toHaveBeenCalled();
      });
    });

    describe('Force Refresh', () => {
      it('should bypass cache when forceRefresh is true', async () => {
        // Arrange
        mockCache.getBrand.mockReturnValue(mockBrand1);
        mockBrandDetailsScraper.mockResolvedValue(mockBrand2);

        // Act
        const result = await brandService.getBrandBySlug('sarma', true);

        // Assert
        expect(mockBrandDetailsScraper).toHaveBeenCalledWith('sarma');
        expect(result).toEqual(mockBrand2);
      });

      it('should update cache when forceRefresh is true', async () => {
        // Arrange
        mockCache.getBrand.mockReturnValue(mockBrand1);
        mockBrandDetailsScraper.mockResolvedValue(mockBrand2);

        // Act
        await brandService.getBrandBySlug('sarma', true);

        // Assert
        expect(mockCache.setBrand).toHaveBeenCalledWith(mockBrand2, 86400);
      });
    });

    describe('Error Handling', () => {
      it('should fall back to stale cache on scraper error', async () => {
        // Arrange
        mockCache.getBrand.mockReturnValueOnce(null).mockReturnValueOnce(mockBrand1);
        mockBrandDetailsScraper.mockRejectedValue(new Error('Network error'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        const result = await brandService.getBrandBySlug('sarma');

        // Assert
        expect(result).toEqual(mockBrand1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to scrape brand details for slug: sarma',
          expect.any(Error)
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith('Returning stale cached brand data for slug: sarma');

        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
      });

      it('should return null when scraper fails and no cache', async () => {
        // Arrange
        mockCache.getBrand.mockReturnValue(null);
        mockBrandDetailsScraper.mockRejectedValue(new Error('Network error'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        const result = await brandService.getBrandBySlug('nonexistent');

        // Assert
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to scrape brand details for slug: nonexistent',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });

      it('should log error when scraper fails', async () => {
        // Arrange
        mockCache.getBrand.mockReturnValue(null);
        mockBrandDetailsScraper.mockRejectedValue(new Error('Test error'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        await brandService.getBrandBySlug('sarma');

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to scrape brand details for slug: sarma',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });
    });
  });

  // ============================================================================
  // getBrandsByCountry() Tests
  // ============================================================================

  describe('getBrandsByCountry', () => {
    describe('Filtering', () => {
      it('should filter brands by country (case-insensitive)', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([mockBrand1, mockBrand2, mockBrand3]);

        // Act
        const result = await brandService.getBrandsByCountry('россия');

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].slug).toBe('sarma');
        expect(result[1].slug).toBe('dogma');
      });

      it('should filter brands by country (uppercase)', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([mockBrand1, mockBrand2, mockBrand3]);

        // Act
        const result = await brandService.getBrandsByCountry('США');

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].slug).toBe('tangiers');
      });

      it('should filter brands by country (lowercase)', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([mockBrand1, mockBrand2, mockBrand3]);

        // Act
        const result = await brandService.getBrandsByCountry('сша');

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].slug).toBe('tangiers');
      });

      it('should filter brands by country (mixed case)', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([mockBrand1, mockBrand2, mockBrand3]);

        // Act
        const result = await brandService.getBrandsByCountry('РоСсИя');

        // Assert
        expect(result).toHaveLength(2);
      });

      it('should return all matching brands', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([mockBrand1, mockBrand2, mockBrand3]);

        // Act
        const result = await brandService.getBrandsByCountry('Россия');

        // Assert
        expect(result).toHaveLength(2);
        expect(result.every((brand: Brand) => brand.country === 'Россия')).toBe(true);
      });
    });

    describe('Empty Results', () => {
      it('should return empty array when no brands match country', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([mockBrand1, mockBrand2, mockBrand3]);

        // Act
        const result = await brandService.getBrandsByCountry('Germany');

        // Assert
        expect(result).toEqual([]);
      });

      it('should return empty array when no brands in cache', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue([]);

        // Act
        const result = await brandService.getBrandsByCountry('Россия');

        // Assert
        expect(result).toEqual([]);
      });

      it('should return empty array when cache is null', async () => {
        // Arrange
        mockCache.getBrands.mockReturnValue(null as any);

        // Act
        const result = await brandService.getBrandsByCountry('Россия');

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('Error Handling', () => {
      it('should return empty array on error', async () => {
        // Arrange
        mockCache.getBrands.mockImplementation(() => {
          throw new Error('Cache error');
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        const result = await brandService.getBrandsByCountry('Россия');

        // Assert
        expect(result).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to get brands by country: Россия',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });

      it('should log error when filtering fails', async () => {
        // Arrange
        mockCache.getBrands.mockImplementation(() => {
          throw new Error('Test error');
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        await brandService.getBrandsByCountry('Россия');

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to get brands by country: Россия',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });
    });
  });

  // ============================================================================
  // refreshBrandCache() Tests
  // ============================================================================

  describe('refreshBrandCache', () => {
    it('should call getAllBrands with forceRefresh=true', async () => {
      // Arrange
      mockCache.getBrands.mockReturnValue([]);
      mockBrandScraper.mockResolvedValue(mockBrandSummaries);

      // Act
      await brandService.refreshBrandCache();

      // Assert
      expect(mockBrandScraper).toHaveBeenCalled();
    });

    it('should update cache with fresh data', async () => {
      // Arrange
      mockCache.getBrands.mockReturnValue([]);
      mockBrandScraper.mockResolvedValue(mockBrandSummaries);

      // Act
      await brandService.refreshBrandCache();

      // Assert
      expect(mockCache.setBrands).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ slug: 'sarma' }),
          expect.objectContaining({ slug: 'dogma' }),
          expect.objectContaining({ slug: 'tangiers' }),
        ]),
        86400
      );
    });

    it('should log error on refresh failure', async () => {
      // Arrange
      mockCache.getBrands.mockReturnValue([]);
      mockBrandScraper.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await brandService.refreshBrandCache();

      // Assert
      // Error is logged in getAllBrands, not in refreshBrandCache
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to scrape brands list:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should return empty array on refresh failure when no cache', async () => {
      // Arrange
      mockCache.getBrands.mockReturnValue([]);
      mockBrandScraper.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await brandService.getAllBrands(true);

      // Assert
      expect(result).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    it('should return empty array on force refresh failure', async () => {
      // Arrange
      // When forceRefresh is true, cache is bypassed, so no stale cache to fall back to
      mockCache.getBrands.mockReturnValue([]);
      mockBrandScraper.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act
      const result = await brandService.getAllBrands(true);

      // Assert
      // With forceRefresh, cache is bypassed, so on error there's nothing to fall back to
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to scrape brands list:', expect.any(Error));
      expect(consoleWarnSpy).not.toHaveBeenCalled(); // No warning because no stale cache to return

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    it('should handle multiple method calls with cache', async () => {
      // Arrange
      mockCache.getBrands.mockReturnValue([mockBrand1, mockBrand2, mockBrand3]);
      mockCache.getBrand.mockReturnValue(mockBrand1);

      // Act
      const allBrands = await brandService.getAllBrands();
      const specificBrand = await brandService.getBrandBySlug('sarma');
      const russianBrands = await brandService.getBrandsByCountry('Россия');

      // Assert
      expect(allBrands).toHaveLength(3);
      expect(specificBrand).toEqual(mockBrand1);
      expect(russianBrands).toHaveLength(2);
      expect(mockBrandScraper).not.toHaveBeenCalled();
      expect(mockBrandDetailsScraper).not.toHaveBeenCalled();
    });

    it('should handle cache miss followed by cache hit', async () => {
      // Arrange
      mockCache.getBrands.mockReturnValueOnce([]).mockReturnValueOnce([mockBrand1, mockBrand2, mockBrand3]);
      mockBrandScraper.mockResolvedValue(mockBrandSummaries);

      // Act
      const result1 = await brandService.getAllBrands();
      const result2 = await brandService.getAllBrands();

      // Assert
      expect(result1).toHaveLength(3);
      expect(result2).toHaveLength(3);
      expect(mockBrandScraper).toHaveBeenCalledTimes(1);
      expect(mockCache.setBrands).toHaveBeenCalledTimes(1);
    });

    it('should handle force refresh followed by normal call', async () => {
      // Arrange
      mockCache.getBrands.mockReturnValue([mockBrand1]);
      mockBrandScraper.mockResolvedValue(mockBrandSummaries);

      // Act
      await brandService.getAllBrands(true);
      await brandService.getAllBrands();

      // Assert
      expect(mockBrandScraper).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty slug in getBrandBySlug', async () => {
      // Arrange
      mockCache.getBrand.mockReturnValue(null);
      mockBrandDetailsScraper.mockResolvedValue(null);

      // Act
      const result = await brandService.getBrandBySlug('');

      // Assert
      expect(result).toBeNull();
      expect(mockBrandDetailsScraper).toHaveBeenCalledWith('');
    });

    it('should handle special characters in country name', async () => {
      // Arrange
      const brandWithSpecialCountry: Brand = {
        ...mockBrand1,
        country: 'Côte d\'Ivoire',
      };
      mockCache.getBrands.mockReturnValue([brandWithSpecialCountry]);

      // Act
      const result = await brandService.getBrandsByCountry('Côte d\'Ivoire');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].country).toBe('Côte d\'Ivoire');
    });

    it('should handle whitespace in country name', async () => {
      // Arrange
      mockCache.getBrands.mockReturnValue([mockBrand1, mockBrand2, mockBrand3]);

      // Act
      const result = await brandService.getBrandsByCountry(' Россия ');

      // Assert
      expect(result).toHaveLength(0); // Whitespace should not match
    });

    it('should handle very long country name', async () => {
      // Arrange
      const longCountry = 'A'.repeat(100);
      const brandWithLongCountry: Brand = {
        ...mockBrand1,
        country: longCountry,
      };
      mockCache.getBrands.mockReturnValue([brandWithLongCountry]);

      // Act
      const result = await brandService.getBrandsByCountry(longCountry);

      // Assert
      expect(result).toHaveLength(1);
    });
  });
});
