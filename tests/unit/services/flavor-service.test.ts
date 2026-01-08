/**
 * Unit tests for FlavorService
 * 
 * Tests FlavorService functionality including:
 * - Constructor and initialization
 * - getAllFlavors() method with caching
 * - getFlavorBySlug() method with caching
 * - getFlavorsByBrand() method
 * - getFlavorsByLine() method
 * - getFlavorsByTag() method
 * - refreshFlavorCache() method
 * - Error handling and fallback behavior
 */

import { FlavorService } from '../../src/services';
import { Flavor } from '../../src/types';
import { ICache } from '../../src/cache';
import { scrapeFlavorDetails } from '../../src/scraper';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock scraper function
jest.mock('../../src/scraper', () => ({
  scrapeFlavorDetails: jest.fn(),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockFlavor1: Flavor = {
  slug: 'sarma/klassicheskaya/zima',
  name: 'Зима',
  nameAlt: null,
  description: 'Winter flavor with mint and cooling effect',
  brandSlug: 'sarma',
  brandName: 'Сарма',
  lineSlug: 'klassicheskaya',
  lineName: 'Классическая',
  country: 'Россия',
  officialStrength: 'Средняя',
  userStrength: '4',
  status: 'Выпускается',
  imageUrl: 'https://example.com/zima.jpg',
  tags: ['Холодок', 'Мята'],
  rating: 4.5,
  ratingsCount: 100,
  reviewsCount: 50,
  viewsCount: 1000,
  ratingDistribution: {
    count1: 5,
    count2: 10,
    count3: 15,
    count4: 30,
    count5: 40,
  },
  smokeAgainPercentage: 85,
  htreviewsId: 12345,
  dateAdded: new Date('2024-01-01'),
  addedBy: 'testuser',
};

const mockFlavor2: Flavor = {
  slug: 'sarma/klassicheskaya/letnyaya',
  name: 'Летняя',
  nameAlt: null,
  description: 'Summer flavor with fruits',
  brandSlug: 'sarma',
  brandName: 'Сарма',
  lineSlug: 'klassicheskaya',
  lineName: 'Классическая',
  country: 'Россия',
  officialStrength: 'Лёгкая',
  userStrength: '2',
  status: 'Выпускается',
  imageUrl: 'https://example.com/letnyaya.jpg',
  tags: ['Фрукты', 'Сладкое'],
  rating: 4.2,
  ratingsCount: 80,
  reviewsCount: 40,
  viewsCount: 800,
  ratingDistribution: {
    count1: 3,
    count2: 7,
    count3: 20,
    count4: 30,
    count5: 20,
  },
  smokeAgainPercentage: 80,
  htreviewsId: 12346,
  dateAdded: new Date('2024-01-02'),
  addedBy: 'testuser',
};

const mockFlavor3: Flavor = {
  slug: 'dogma/premium/mango',
  name: 'Манго',
  nameAlt: 'Mango',
  description: 'Sweet mango flavor',
  brandSlug: 'dogma',
  brandName: 'Догма',
  lineSlug: 'premium',
  lineName: 'Premium',
  country: 'Россия',
  officialStrength: 'Средняя',
  userStrength: '3',
  status: 'Выпускается',
  imageUrl: 'https://example.com/mango.jpg',
  tags: ['Фрукты', 'Тропическое', 'Сладкое'],
  rating: 4.6,
  ratingsCount: 120,
  reviewsCount: 60,
  viewsCount: 1200,
  ratingDistribution: {
    count1: 2,
    count2: 8,
    count3: 10,
    count4: 40,
    count5: 60,
  },
  smokeAgainPercentage: 90,
  htreviewsId: 12347,
  dateAdded: new Date('2024-01-03'),
  addedBy: 'testuser',
};

const mockFlavor4: Flavor = {
  slug: 'tangiers/noir/mint',
  name: 'Mint',
  nameAlt: 'Мята',
  description: 'Classic mint flavor',
  brandSlug: 'tangiers',
  brandName: 'Tangiers',
  lineSlug: 'noir',
  lineName: 'Noir',
  country: 'США',
  officialStrength: 'Крепкая',
  userStrength: '5',
  status: 'Выпускается',
  imageUrl: 'https://example.com/mint.jpg',
  tags: ['Холодок', 'Мята', 'Крепкое'],
  rating: 4.7,
  ratingsCount: 200,
  reviewsCount: 100,
  viewsCount: 2000,
  ratingDistribution: {
    count1: 5,
    count2: 5,
    count3: 10,
    count4: 40,
    count5: 140,
  },
  smokeAgainPercentage: 95,
  htreviewsId: 12348,
  dateAdded: new Date('2024-01-04'),
  addedBy: 'testuser',
};

const allMockFlavors: Flavor[] = [mockFlavor1, mockFlavor2, mockFlavor3, mockFlavor4];

// ============================================================================
// Test Suite
// ============================================================================

describe('FlavorService', () => {
  let flavorService: FlavorService;
  let mockCache: jest.Mocked<ICache>;
  let mockFlavorDetailsScraper: jest.MockedFunction<typeof scrapeFlavorDetails>;

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

    // Get mocked scraper function
    mockFlavorDetailsScraper = scrapeFlavorDetails as jest.MockedFunction<typeof scrapeFlavorDetails>;

    // Create FlavorService instance
    flavorService = new FlavorService(
      mockCache,
      mockFlavorDetailsScraper
    );
  });

  // ============================================================================
  // Constructor and Initialization Tests
  // ============================================================================

  describe('Constructor', () => {
    it('should initialize FlavorService with dependencies', () => {
      expect(flavorService).toBeInstanceOf(FlavorService);
    });

    it('should store cache dependency', () => {
      const service = flavorService as any;
      expect(service.cache).toBe(mockCache);
    });

    it('should store flavorDetailsScraper dependency', () => {
      const service = flavorService as any;
      expect(service.flavorDetailsScraper).toBe(mockFlavorDetailsScraper);
    });
  });

  // ============================================================================
  // getAllFlavors() Tests
  // ============================================================================

  describe('getAllFlavors', () => {
    describe('Cache Hit', () => {
      it('should return flavors from cache when available', async () => {
        // Arrange
        const cachedFlavors = [mockFlavor1, mockFlavor2];
        mockCache.getFlavors.mockReturnValue(cachedFlavors);

        // Act
        const result = await flavorService.getAllFlavors();

        // Assert
        expect(result).toEqual(cachedFlavors);
        expect(mockCache.getFlavors).toHaveBeenCalled();
        expect(mockFlavorDetailsScraper).not.toHaveBeenCalled();
        expect(mockCache.setFlavors).not.toHaveBeenCalled();
      });

      it('should not call scraper when cache has data', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue([mockFlavor1]);

        // Act
        await flavorService.getAllFlavors();

        // Assert
        expect(mockFlavorDetailsScraper).not.toHaveBeenCalled();
      });

      it('should not update cache when returning cached data', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue([mockFlavor1]);

        // Act
        await flavorService.getAllFlavors();

        // Assert
        expect(mockCache.setFlavors).not.toHaveBeenCalled();
      });

      it('should return empty array when cache has empty array', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue([]);

        // Act
        const result = await flavorService.getAllFlavors();

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('Cache Miss', () => {
      it('should return empty array when cache is null', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(null as any);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        const result = await flavorService.getAllFlavors();

        // Assert
        expect(result).toEqual([]);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'getAllFlavors: Cannot scrape all flavors without BrandService. Use getFlavorBySlug for individual flavors.'
        );

        consoleWarnSpy.mockRestore();
      });

      it('should log warning when cache is empty', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(null as any);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        await flavorService.getAllFlavors();

        // Assert
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'getAllFlavors: Cannot scrape all flavors without BrandService. Use getFlavorBySlug for individual flavors.'
        );

        consoleWarnSpy.mockRestore();
      });

      it('should return cached flavors when cache miss but data available', async () => {
        // Arrange
        const cachedFlavors = [mockFlavor1, mockFlavor2];
        mockCache.getFlavors.mockReturnValueOnce(null as any).mockReturnValueOnce(cachedFlavors);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        const result = await flavorService.getAllFlavors();

        // Assert
        expect(result).toEqual(cachedFlavors);
        expect(mockCache.getFlavors).toHaveBeenCalledTimes(2);

        consoleWarnSpy.mockRestore();
      });
    });

    describe('Force Refresh', () => {
      it('should bypass cache when forceRefresh is true', async () => {
        // Arrange
        const cachedFlavors = [mockFlavor1];
        mockCache.getFlavors.mockReturnValue(cachedFlavors);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        await flavorService.getAllFlavors(true);

        // Assert
        expect(mockCache.getFlavors).toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'getAllFlavors: Cannot scrape all flavors without BrandService. Use getFlavorBySlug for individual flavors.'
        );

        consoleWarnSpy.mockRestore();
      });

      it('should return empty array when forceRefresh and no fresh data', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue([]);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        const result = await flavorService.getAllFlavors(true);

        // Assert
        expect(result).toEqual([]);

        consoleWarnSpy.mockRestore();
      });

      it('should return cached flavors when forceRefresh and cache has data', async () => {
        // Arrange
        const cachedFlavors = [mockFlavor1, mockFlavor2];
        mockCache.getFlavors.mockReturnValue(cachedFlavors);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        const result = await flavorService.getAllFlavors(true);

        // Assert
        expect(result).toEqual(cachedFlavors);

        consoleWarnSpy.mockRestore();
      });
    });
  });

  // ============================================================================
  // getFlavorBySlug() Tests
  // ============================================================================

  describe('getFlavorBySlug', () => {
    describe('Cache Hit', () => {
      it('should return flavor from cache when available', async () => {
        // Arrange
        mockCache.getFlavor.mockReturnValue(mockFlavor1);

        // Act
        const result = await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima');

        // Assert
        expect(result).toEqual(mockFlavor1);
        expect(mockCache.getFlavor).toHaveBeenCalledWith('sarma/klassicheskaya/zima');
        expect(mockFlavorDetailsScraper).not.toHaveBeenCalled();
        expect(mockCache.setFlavor).not.toHaveBeenCalled();
      });

      it('should not call scraper when cache has flavor', async () => {
        // Arrange
        mockCache.getFlavor.mockReturnValue(mockFlavor1);

        // Act
        await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima');

        // Assert
        expect(mockFlavorDetailsScraper).not.toHaveBeenCalled();
      });

      it('should not update cache when returning cached flavor', async () => {
        // Arrange
        mockCache.getFlavor.mockReturnValue(mockFlavor1);

        // Act
        await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima');

        // Assert
        expect(mockCache.setFlavor).not.toHaveBeenCalled();
      });
    });

    describe('Cache Miss', () => {
      it('should call scraper when cache miss', async () => {
        // Arrange
        mockCache.getFlavor.mockReturnValue(null);
        mockFlavorDetailsScraper.mockResolvedValue(mockFlavor1);

        // Act
        await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima');

        // Assert
        expect(mockFlavorDetailsScraper).toHaveBeenCalledWith('sarma/klassicheskaya/zima');
      });

      it('should cache scraped flavor with TTL', async () => {
        // Arrange
        mockCache.getFlavor.mockReturnValue(null);
        mockFlavorDetailsScraper.mockResolvedValue(mockFlavor1);
        mockCache.getFlavors.mockReturnValue([]);

        // Act
        await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima');

        // Assert
        expect(mockCache.setFlavor).toHaveBeenCalledWith(
          mockFlavor1,
          86400 // 24 hours in seconds
        );
      });

      it('should update flavors list in cache', async () => {
        // Arrange
        mockCache.getFlavor.mockReturnValue(null);
        mockFlavorDetailsScraper.mockResolvedValue(mockFlavor1);
        mockCache.getFlavors.mockReturnValue([mockFlavor2, mockFlavor3]);

        // Act
        await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima');

        // Assert
        expect(mockCache.setFlavors).toHaveBeenCalledWith(
          expect.arrayContaining([mockFlavor1, mockFlavor2, mockFlavor3]),
          86400
        );
      });

      it('should return scraped flavor', async () => {
        // Arrange
        mockCache.getFlavor.mockReturnValue(null);
        mockFlavorDetailsScraper.mockResolvedValue(mockFlavor1);
        mockCache.getFlavors.mockReturnValue([]);

        // Act
        const result = await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima');

        // Assert
        expect(result).toEqual(mockFlavor1);
      });

      it('should return null when scraper returns null', async () => {
        // Arrange
        mockCache.getFlavor.mockReturnValue(null);
        mockFlavorDetailsScraper.mockResolvedValue(null);

        // Act
        const result = await flavorService.getFlavorBySlug('nonexistent');

        // Assert
        expect(result).toBeNull();
      });

      it('should not cache when scraper returns null', async () => {
        // Arrange
        mockCache.getFlavor.mockReturnValue(null);
        mockFlavorDetailsScraper.mockResolvedValue(null);

        // Act
        await flavorService.getFlavorBySlug('nonexistent');

        // Assert
        expect(mockCache.setFlavor).not.toHaveBeenCalled();
        expect(mockCache.setFlavors).not.toHaveBeenCalled();
      });
    });

    describe('Force Refresh', () => {
      it('should bypass cache when forceRefresh is true', async () => {
        // Arrange
        mockCache.getFlavor.mockReturnValue(mockFlavor1);
        mockFlavorDetailsScraper.mockResolvedValue(mockFlavor2);
        mockCache.getFlavors.mockReturnValue([]);

        // Act
        const result = await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima', true);

        // Assert
        expect(mockFlavorDetailsScraper).toHaveBeenCalledWith('sarma/klassicheskaya/zima');
        expect(result).toEqual(mockFlavor2);
      });

      it('should update cache when forceRefresh is true', async () => {
        // Arrange
        mockCache.getFlavor.mockReturnValue(mockFlavor1);
        mockFlavorDetailsScraper.mockResolvedValue(mockFlavor2);
        mockCache.getFlavors.mockReturnValue([]);

        // Act
        await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima', true);

        // Assert
        expect(mockCache.setFlavor).toHaveBeenCalledWith(mockFlavor2, 86400);
      });
    });

    describe('Error Handling', () => {
      it('should fall back to stale cache on scraper error', async () => {
        // Arrange
        mockCache.getFlavor.mockReturnValueOnce(null).mockReturnValueOnce(mockFlavor1);
        mockFlavorDetailsScraper.mockRejectedValue(new Error('Network error'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        const result = await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima');

        // Assert
        expect(result).toEqual(mockFlavor1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to scrape flavor details for slug: sarma/klassicheskaya/zima',
          expect.any(Error)
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith('Returning stale cached flavor data for slug: sarma/klassicheskaya/zima');

        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
      });

      it('should return null when scraper fails and no cache', async () => {
        // Arrange
        mockCache.getFlavor.mockReturnValue(null);
        mockFlavorDetailsScraper.mockRejectedValue(new Error('Network error'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        const result = await flavorService.getFlavorBySlug('nonexistent');

        // Assert
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to scrape flavor details for slug: nonexistent',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });

      it('should log error when scraper fails', async () => {
        // Arrange
        mockCache.getFlavor.mockReturnValue(null);
        mockFlavorDetailsScraper.mockRejectedValue(new Error('Test error'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima');

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to scrape flavor details for slug: sarma/klassicheskaya/zima',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });
    });
  });

  // ============================================================================
  // getFlavorsByBrand() Tests
  // ============================================================================

  describe('getFlavorsByBrand', () => {
    describe('Filtering', () => {
      it('should filter flavors by brandSlug', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByBrand('sarma');

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].slug).toBe('sarma/klassicheskaya/zima');
        expect(result[1].slug).toBe('sarma/klassicheskaya/letnyaya');
      });

      it('should return all matching flavors', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByBrand('sarma');

        // Assert
        expect(result).toHaveLength(2);
        expect(result.every(flavor => flavor.brandSlug === 'sarma')).toBe(true);
      });

      it('should filter single flavor by brandSlug', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByBrand('dogma');

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].slug).toBe('dogma/premium/mango');
      });
    });

    describe('Empty Results', () => {
      it('should return empty array when no flavors match brand', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByBrand('nonexistent');

        // Assert
        expect(result).toEqual([]);
      });

      it('should return empty array when no flavors in cache', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue([]);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        const result = await flavorService.getFlavorsByBrand('sarma');

        // Assert
        expect(result).toEqual([]);

        consoleWarnSpy.mockRestore();
      });

      it('should return empty array when cache is null', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(null as any);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        const result = await flavorService.getFlavorsByBrand('sarma');

        // Assert
        expect(result).toEqual([]);

        consoleWarnSpy.mockRestore();
      });
    });

    describe('Error Handling', () => {
      it('should fall back to cache getFlavorsByBrand on error', async () => {
        // Arrange
        mockCache.getFlavors.mockImplementation(() => {
          throw new Error('Cache error');
        });
        mockCache.getFlavorsByBrand.mockReturnValue([mockFlavor1, mockFlavor2]);
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        const result = await flavorService.getFlavorsByBrand('sarma');

        // Assert
        expect(result).toEqual([mockFlavor1, mockFlavor2]);
        expect(mockCache.getFlavorsByBrand).toHaveBeenCalledWith('sarma');
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to get flavors by brand: sarma',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });

      it('should return empty array on error when fallback fails', async () => {
        // Arrange
        mockCache.getFlavors.mockImplementation(() => {
          throw new Error('Cache error');
        });
        mockCache.getFlavorsByBrand.mockImplementation(() => {
          throw new Error('Fallback error');
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        const result = await flavorService.getFlavorsByBrand('sarma');

        // Assert
        expect(result).toEqual([]);

        consoleErrorSpy.mockRestore();
      });

      it('should log error when filtering fails', async () => {
        // Arrange
        mockCache.getFlavors.mockImplementation(() => {
          throw new Error('Test error');
        });
        mockCache.getFlavorsByBrand.mockReturnValue([]);
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        await flavorService.getFlavorsByBrand('sarma');

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to get flavors by brand: sarma',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });
    });
  });

  // ============================================================================
  // getFlavorsByLine() Tests
  // ============================================================================

  describe('getFlavorsByLine', () => {
    describe('Filtering', () => {
      it('should filter flavors by lineSlug', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByLine('klassicheskaya');

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].slug).toBe('sarma/klassicheskaya/zima');
        expect(result[1].slug).toBe('sarma/klassicheskaya/letnyaya');
      });

      it('should return all matching flavors', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByLine('klassicheskaya');

        // Assert
        expect(result).toHaveLength(2);
        expect(result.every(flavor => flavor.lineSlug === 'klassicheskaya')).toBe(true);
      });

      it('should filter single flavor by lineSlug', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByLine('premium');

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].slug).toBe('dogma/premium/mango');
      });
    });

    describe('Empty Results', () => {
      it('should return empty array when no flavors match line', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByLine('nonexistent');

        // Assert
        expect(result).toEqual([]);
      });

      it('should return empty array when no flavors in cache', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue([]);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        const result = await flavorService.getFlavorsByLine('klassicheskaya');

        // Assert
        expect(result).toEqual([]);

        consoleWarnSpy.mockRestore();
      });

      it('should return empty array when cache is null', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(null as any);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        const result = await flavorService.getFlavorsByLine('klassicheskaya');

        // Assert
        expect(result).toEqual([]);

        consoleWarnSpy.mockRestore();
      });
    });

    describe('Error Handling', () => {
      it('should return empty array on error', async () => {
        // Arrange
        mockCache.getFlavors.mockImplementation(() => {
          throw new Error('Cache error');
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        const result = await flavorService.getFlavorsByLine('klassicheskaya');

        // Assert
        expect(result).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to get flavors by line: klassicheskaya',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });

      it('should log error when filtering fails', async () => {
        // Arrange
        mockCache.getFlavors.mockImplementation(() => {
          throw new Error('Test error');
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        await flavorService.getFlavorsByLine('klassicheskaya');

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to get flavors by line: klassicheskaya',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });
    });
  });

  // ============================================================================
  // getFlavorsByTag() Tests
  // ============================================================================

  describe('getFlavorsByTag', () => {
    describe('Filtering', () => {
      it('should filter flavors by tag (case-insensitive)', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByTag('холодок');

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].slug).toBe('sarma/klassicheskaya/zima');
        expect(result[1].slug).toBe('tangiers/noir/mint');
      });

      it('should filter flavors by tag (uppercase)', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByTag('ХОЛОДОК');

        // Assert
        expect(result).toHaveLength(2);
      });

      it('should filter flavors by tag (lowercase)', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByTag('холодок');

        // Assert
        expect(result).toHaveLength(2);
      });

      it('should filter flavors by tag (mixed case)', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByTag('ХоЛоДоК');

        // Assert
        expect(result).toHaveLength(2);
      });

      it('should filter flavors by tag (English)', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByTag('мята');

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].slug).toBe('sarma/klassicheskaya/zima');
        expect(result[1].slug).toBe('tangiers/noir/mint');
      });

      it('should match flavors with multiple tags', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByTag('сладкое');

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].slug).toBe('sarma/klassicheskaya/letnyaya');
        expect(result[1].slug).toBe('dogma/premium/mango');
      });

      it('should match flavors with specific tag', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByTag('тропическое');

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].slug).toBe('dogma/premium/mango');
      });

      it('should return all matching flavors', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByTag('фрукты');

        // Assert
        expect(result).toHaveLength(2);
        expect(result.every(flavor => flavor.tags.some(tag => tag.toLowerCase() === 'фрукты'))).toBe(true);
      });
    });

    describe('Empty Results', () => {
      it('should return empty array when no flavors match tag', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(allMockFlavors);

        // Act
        const result = await flavorService.getFlavorsByTag('nonexistent');

        // Assert
        expect(result).toEqual([]);
      });

      it('should return empty array when no flavors in cache', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue([]);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        const result = await flavorService.getFlavorsByTag('холодок');

        // Assert
        expect(result).toEqual([]);

        consoleWarnSpy.mockRestore();
      });

      it('should return empty array when cache is null', async () => {
        // Arrange
        mockCache.getFlavors.mockReturnValue(null as any);
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Act
        const result = await flavorService.getFlavorsByTag('холодок');

        // Assert
        expect(result).toEqual([]);

        consoleWarnSpy.mockRestore();
      });
    });

    describe('Error Handling', () => {
      it('should return empty array on error', async () => {
        // Arrange
        mockCache.getFlavors.mockImplementation(() => {
          throw new Error('Cache error');
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        const result = await flavorService.getFlavorsByTag('холодок');

        // Assert
        expect(result).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to get flavors by tag: холодок',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });

      it('should log error when filtering fails', async () => {
        // Arrange
        mockCache.getFlavors.mockImplementation(() => {
          throw new Error('Test error');
        });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // Act
        await flavorService.getFlavorsByTag('холодок');

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to get flavors by tag: холодок',
          expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
      });
    });
  });

  // ============================================================================
  // refreshFlavorCache() Tests
  // ============================================================================

  describe('refreshFlavorCache', () => {
    it('should call getAllFlavors with forceRefresh=true', async () => {
      // Arrange
      mockCache.getFlavors.mockReturnValue([]);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act
      await flavorService.refreshFlavorCache();

      // Assert
      expect(mockCache.getFlavors).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should log error on refresh failure', async () => {
      // Arrange
      mockCache.getFlavors.mockImplementation(() => {
        throw new Error('Test error');
      });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await expect(flavorService.refreshFlavorCache()).rejects.toThrow('Test error');

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh flavor cache:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should throw error on refresh failure', async () => {
      // Arrange
      mockCache.getFlavors.mockImplementation(() => {
        throw new Error('Network error');
      });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(flavorService.refreshFlavorCache()).rejects.toThrow('Network error');

      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    it('should handle multiple method calls with cache', async () => {
      // Arrange
      mockCache.getFlavors.mockReturnValue(allMockFlavors);
      mockCache.getFlavor.mockReturnValue(mockFlavor1);

      // Act
      const allFlavors = await flavorService.getAllFlavors();
      const specificFlavor = await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima');
      const sarmaFlavors = await flavorService.getFlavorsByBrand('sarma');
      const classicFlavors = await flavorService.getFlavorsByLine('klassicheskaya');
      const mintFlavors = await flavorService.getFlavorsByTag('мята');

      // Assert
      expect(allFlavors).toHaveLength(4);
      expect(specificFlavor).toEqual(mockFlavor1);
      expect(sarmaFlavors).toHaveLength(2);
      expect(classicFlavors).toHaveLength(2);
      expect(mintFlavors).toHaveLength(2);
      expect(mockFlavorDetailsScraper).not.toHaveBeenCalled();
    });

    it('should handle cache miss followed by cache hit for getFlavorBySlug', async () => {
      // Arrange
      mockCache.getFlavor.mockReturnValueOnce(null).mockReturnValueOnce(mockFlavor1);
      mockFlavorDetailsScraper.mockResolvedValue(mockFlavor1);
      mockCache.getFlavors.mockReturnValue([]);

      // Act
      const result1 = await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima');
      const result2 = await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima');

      // Assert
      expect(result1).toEqual(mockFlavor1);
      expect(result2).toEqual(mockFlavor1);
      expect(mockFlavorDetailsScraper).toHaveBeenCalledTimes(1);
      expect(mockCache.setFlavor).toHaveBeenCalledTimes(1);
    });

    it('should handle force refresh followed by normal call', async () => {
      // Arrange
      mockCache.getFlavor.mockReturnValue(mockFlavor1);
      mockFlavorDetailsScraper.mockResolvedValue(mockFlavor2);
      mockCache.getFlavors.mockReturnValue([]);

      // Act
      await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima', true);
      await flavorService.getFlavorBySlug('sarma/klassicheskaya/zima');

      // Assert
      expect(mockFlavorDetailsScraper).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty slug in getFlavorBySlug', async () => {
      // Arrange
      mockCache.getFlavor.mockReturnValue(null);
      mockFlavorDetailsScraper.mockResolvedValue(null);

      // Act
      const result = await flavorService.getFlavorBySlug('');

      // Assert
      expect(result).toBeNull();
      expect(mockFlavorDetailsScraper).toHaveBeenCalledWith('');
    });

    it('should handle special characters in tag', async () => {
      // Arrange
      const flavorWithSpecialTag: Flavor = {
        ...mockFlavor1,
        tags: ['Специальный тег!'],
      };
      mockCache.getFlavors.mockReturnValue([flavorWithSpecialTag]);

      // Act
      const result = await flavorService.getFlavorsByTag('Специальный тег!');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('Специальный тег!');
    });

    it('should handle whitespace in brandSlug', async () => {
      // Arrange
      mockCache.getFlavors.mockReturnValue(allMockFlavors);

      // Act
      const result = await flavorService.getFlavorsByBrand(' sarma ');

      // Assert
      expect(result).toHaveLength(0); // Whitespace should not match
    });

    it('should handle whitespace in tag', async () => {
      // Arrange
      mockCache.getFlavors.mockReturnValue(allMockFlavors);

      // Act
      const result = await flavorService.getFlavorsByTag(' холодок ');

      // Assert
      expect(result).toHaveLength(0); // Whitespace should not match
    });

    it('should handle very long tag name', async () => {
      // Arrange
      const longTag = 'A'.repeat(100);
      const flavorWithLongTag: Flavor = {
        ...mockFlavor1,
        tags: [longTag],
      };
      mockCache.getFlavors.mockReturnValue([flavorWithLongTag]);

      // Act
      const result = await flavorService.getFlavorsByTag(longTag);

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should handle flavor with no tags', async () => {
      // Arrange
      const flavorWithNoTags: Flavor = {
        ...mockFlavor1,
        tags: [],
      };
      mockCache.getFlavors.mockReturnValue([flavorWithNoTags]);

      // Act
      const result = await flavorService.getFlavorsByTag('холодок');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle empty tags array', async () => {
      // Arrange
      const flavorWithEmptyTags: Flavor = {
        ...mockFlavor1,
        tags: [],
      };
      mockCache.getFlavors.mockReturnValue([flavorWithEmptyTags]);

      // Act
      const result = await flavorService.getFlavorsByTag('');

      // Assert
      expect(result).toHaveLength(0);
    });
  });
});
