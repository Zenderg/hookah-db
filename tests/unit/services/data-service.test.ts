/**
 * Unit tests for DataService
 * 
 * Tests DataService functionality including:
 * - Constructor and initialization
 * - Brand operations (delegation to BrandService)
 * - Flavor operations (delegation to FlavorService)
 * - Combined operations (getBrandWithFlavors)
 * - Search operations (searchFlavors)
 * - Cache management (refreshAllCache, clearAllCache)
 * - Health check (getHealthStatus)
 * - Error handling and fallback behavior
 */

import { DataService } from '@hookah-db/services';
import { BrandService } from '@hookah-db/services';
import { FlavorService } from '@hookah-db/services';
import { Brand, Flavor } from '@hookah-db/types';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock services
jest.mock('@hookah-db/services', () => {
  const originalModule = jest.requireActual('@hookah-db/services');
  return {
    ...originalModule,
    BrandService: jest.fn().mockImplementation(() => ({
      getAllBrands: jest.fn(),
      getBrandBySlug: jest.fn(),
      getBrandsByCountry: jest.fn(),
      refreshBrandCache: jest.fn(),
    })),
    FlavorService: jest.fn().mockImplementation(() => ({
      getAllFlavors: jest.fn(),
      getFlavorBySlug: jest.fn(),
      getFlavorsByBrand: jest.fn(),
      getFlavorsByLine: jest.fn(),
      getFlavorsByTag: jest.fn(),
      refreshFlavorCache: jest.fn(),
    })),
  };
});

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
  nameAlt: 'Summer',
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

// ============================================================================
// Test Suite
// ============================================================================

describe('DataService', () => {
  let dataService: DataService;
  let mockBrandService: jest.Mocked<BrandService>;
  let mockFlavorService: jest.Mocked<FlavorService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock services
    mockBrandService = {
      getAllBrands: jest.fn(),
      getBrandBySlug: jest.fn(),
      getBrandsByCountry: jest.fn(),
      refreshBrandCache: jest.fn(),
    } as unknown as jest.Mocked<BrandService>;

    mockFlavorService = {
      getAllFlavors: jest.fn(),
      getFlavorBySlug: jest.fn(),
      getFlavorsByBrand: jest.fn(),
      getFlavorsByLine: jest.fn(),
      getFlavorsByTag: jest.fn(),
      refreshFlavorCache: jest.fn(),
    } as unknown as jest.Mocked<FlavorService>;

    // Create DataService instance
    dataService = new DataService(mockBrandService, mockFlavorService);
  });

  // ============================================================================
  // Constructor and Initialization Tests
  // ============================================================================

  describe('Constructor', () => {
    it('should initialize DataService with dependencies', () => {
      expect(dataService).toBeInstanceOf(DataService);
    });

    it('should store brandService dependency', () => {
      const service = dataService as any;
      expect(service.brandService).toBe(mockBrandService);
    });

    it('should store flavorService dependency', () => {
      const service = dataService as any;
      expect(service.flavorService).toBe(mockFlavorService);
    });
  });

  // ============================================================================
  // Brand Operations Tests (Delegation)
  // ============================================================================

  describe('getAllBrands', () => {
    it('should delegate to brandService.getAllBrands', async () => {
      // Arrange
      const mockBrands = [mockBrand1, mockBrand2];
      mockBrandService.getAllBrands.mockResolvedValue(mockBrands);

      // Act
      const result = await dataService.getAllBrands();

      // Assert
      expect(result).toEqual(mockBrands);
      expect(mockBrandService.getAllBrands).toHaveBeenCalledWith(false);
    });

    it('should pass forceRefresh parameter to brandService', async () => {
      // Arrange
      const mockBrands = [mockBrand1];
      mockBrandService.getAllBrands.mockResolvedValue(mockBrands);

      // Act
      await dataService.getAllBrands(true);

      // Assert
      expect(mockBrandService.getAllBrands).toHaveBeenCalledWith(true);
    });

    it('should return empty array on error', async () => {
      // Arrange
      mockBrandService.getAllBrands.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await dataService.getAllBrands();

      // Assert
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get all brands:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should log error on failure', async () => {
      // Arrange
      mockBrandService.getAllBrands.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await dataService.getAllBrands();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get all brands:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getBrandBySlug', () => {
    it('should delegate to brandService.getBrandBySlug', async () => {
      // Arrange
      mockBrandService.getBrandBySlug.mockResolvedValue(mockBrand1);

      // Act
      const result = await dataService.getBrandBySlug('sarma');

      // Assert
      expect(result).toEqual(mockBrand1);
      expect(mockBrandService.getBrandBySlug).toHaveBeenCalledWith('sarma', false);
    });

    it('should pass forceRefresh parameter to brandService', async () => {
      // Arrange
      mockBrandService.getBrandBySlug.mockResolvedValue(mockBrand1);

      // Act
      await dataService.getBrandBySlug('sarma', true);

      // Assert
      expect(mockBrandService.getBrandBySlug).toHaveBeenCalledWith('sarma', true);
    });

    it('should return null on error', async () => {
      // Arrange
      mockBrandService.getBrandBySlug.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await dataService.getBrandBySlug('sarma');

      // Assert
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get brand by slug: sarma',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log error on failure', async () => {
      // Arrange
      mockBrandService.getBrandBySlug.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await dataService.getBrandBySlug('sarma');

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get brand by slug: sarma',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getBrandsByCountry', () => {
    it('should delegate to brandService.getBrandsByCountry', async () => {
      // Arrange
      const mockBrands = [mockBrand1, mockBrand2];
      mockBrandService.getBrandsByCountry.mockResolvedValue(mockBrands);

      // Act
      const result = await dataService.getBrandsByCountry('Россия');

      // Assert
      expect(result).toEqual(mockBrands);
      expect(mockBrandService.getBrandsByCountry).toHaveBeenCalledWith('Россия');
    });

    it('should return empty array on error', async () => {
      // Arrange
      mockBrandService.getBrandsByCountry.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await dataService.getBrandsByCountry('Россия');

      // Assert
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get brands by country: Россия',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log error on failure', async () => {
      // Arrange
      mockBrandService.getBrandsByCountry.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await dataService.getBrandsByCountry('Россия');

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get brands by country: Россия',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================================
  // Flavor Operations Tests (Delegation)
  // ============================================================================

  describe('getAllFlavors', () => {
    it('should delegate to flavorService.getAllFlavors', async () => {
      // Arrange
      const mockFlavors = [mockFlavor1, mockFlavor2];
      mockFlavorService.getAllFlavors.mockResolvedValue(mockFlavors);

      // Act
      const result = await dataService.getAllFlavors();

      // Assert
      expect(result).toEqual(mockFlavors);
      expect(mockFlavorService.getAllFlavors).toHaveBeenCalledWith(false);
    });

    it('should pass forceRefresh parameter to flavorService', async () => {
      // Arrange
      const mockFlavors = [mockFlavor1];
      mockFlavorService.getAllFlavors.mockResolvedValue(mockFlavors);

      // Act
      await dataService.getAllFlavors(true);

      // Assert
      expect(mockFlavorService.getAllFlavors).toHaveBeenCalledWith(true);
    });

    it('should return empty array on error', async () => {
      // Arrange
      mockFlavorService.getAllFlavors.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await dataService.getAllFlavors();

      // Assert
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get all flavors:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should log error on failure', async () => {
      // Arrange
      mockFlavorService.getAllFlavors.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await dataService.getAllFlavors();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get all flavors:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getFlavorBySlug', () => {
    it('should delegate to flavorService.getFlavorBySlug', async () => {
      // Arrange
      mockFlavorService.getFlavorBySlug.mockResolvedValue(mockFlavor1);

      // Act
      const result = await dataService.getFlavorBySlug('sarma/klassicheskaya/zima');

      // Assert
      expect(result).toEqual(mockFlavor1);
      expect(mockFlavorService.getFlavorBySlug).toHaveBeenCalledWith('sarma/klassicheskaya/zima', false);
    });

    it('should pass forceRefresh parameter to flavorService', async () => {
      // Arrange
      mockFlavorService.getFlavorBySlug.mockResolvedValue(mockFlavor1);

      // Act
      await dataService.getFlavorBySlug('sarma/klassicheskaya/zima', true);

      // Assert
      expect(mockFlavorService.getFlavorBySlug).toHaveBeenCalledWith('sarma/klassicheskaya/zima', true);
    });

    it('should return null on error', async () => {
      // Arrange
      mockFlavorService.getFlavorBySlug.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await dataService.getFlavorBySlug('sarma/klassicheskaya/zima');

      // Assert
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get flavor by slug: sarma/klassicheskaya/zima',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log error on failure', async () => {
      // Arrange
      mockFlavorService.getFlavorBySlug.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await dataService.getFlavorBySlug('sarma/klassicheskaya/zima');

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get flavor by slug: sarma/klassicheskaya/zima',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getFlavorsByBrand', () => {
    it('should delegate to flavorService.getFlavorsByBrand', async () => {
      // Arrange
      const mockFlavors = [mockFlavor1, mockFlavor2];
      mockFlavorService.getFlavorsByBrand.mockResolvedValue(mockFlavors);

      // Act
      const result = await dataService.getFlavorsByBrand('sarma');

      // Assert
      expect(result).toEqual(mockFlavors);
      expect(mockFlavorService.getFlavorsByBrand).toHaveBeenCalledWith('sarma');
    });

    it('should return empty array on error', async () => {
      // Arrange
      mockFlavorService.getFlavorsByBrand.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await dataService.getFlavorsByBrand('sarma');

      // Assert
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get flavors by brand: sarma',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log error on failure', async () => {
      // Arrange
      mockFlavorService.getFlavorsByBrand.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await dataService.getFlavorsByBrand('sarma');

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get flavors by brand: sarma',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getFlavorsByLine', () => {
    it('should delegate to flavorService.getFlavorsByLine', async () => {
      // Arrange
      const mockFlavors = [mockFlavor1, mockFlavor2];
      mockFlavorService.getFlavorsByLine.mockResolvedValue(mockFlavors);

      // Act
      const result = await dataService.getFlavorsByLine('klassicheskaya');

      // Assert
      expect(result).toEqual(mockFlavors);
      expect(mockFlavorService.getFlavorsByLine).toHaveBeenCalledWith('klassicheskaya');
    });

    it('should return empty array on error', async () => {
      // Arrange
      mockFlavorService.getFlavorsByLine.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await dataService.getFlavorsByLine('klassicheskaya');

      // Assert
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get flavors by line: klassicheskaya',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log error on failure', async () => {
      // Arrange
      mockFlavorService.getFlavorsByLine.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await dataService.getFlavorsByLine('klassicheskaya');

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get flavors by line: klassicheskaya',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getFlavorsByTag', () => {
    it('should delegate to flavorService.getFlavorsByTag', async () => {
      // Arrange
      const mockFlavors = [mockFlavor1];
      mockFlavorService.getFlavorsByTag.mockResolvedValue(mockFlavors);

      // Act
      const result = await dataService.getFlavorsByTag('Холодок');

      // Assert
      expect(result).toEqual(mockFlavors);
      expect(mockFlavorService.getFlavorsByTag).toHaveBeenCalledWith('Холодок');
    });

    it('should return empty array on error', async () => {
      // Arrange
      mockFlavorService.getFlavorsByTag.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await dataService.getFlavorsByTag('Холодок');

      // Assert
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get flavors by tag: Холодок',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log error on failure', async () => {
      // Arrange
      mockFlavorService.getFlavorsByTag.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await dataService.getFlavorsByTag('Холодок');

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get flavors by tag: Холодок',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================================
  // Combined Operations Tests
  // ============================================================================

  describe('getBrandWithFlavors', () => {
    it('should return brand and flavors when brand exists', async () => {
      // Arrange
      const mockFlavors = [mockFlavor1, mockFlavor2];
      mockBrandService.getBrandBySlug.mockResolvedValue(mockBrand1);
      mockFlavorService.getFlavorsByBrand.mockResolvedValue(mockFlavors);

      // Act
      const result = await dataService.getBrandWithFlavors('sarma');

      // Assert
      expect(result.brand).toEqual(mockBrand1);
      expect(result.flavors).toEqual(mockFlavors);
      expect(mockBrandService.getBrandBySlug).toHaveBeenCalledWith('sarma', false);
      expect(mockFlavorService.getFlavorsByBrand).toHaveBeenCalledWith('sarma');
    });

    it('should return null brand and empty flavors when brand not found', async () => {
      // Arrange
      mockBrandService.getBrandBySlug.mockResolvedValue(null);

      // Act
      const result = await dataService.getBrandWithFlavors('nonexistent');

      // Assert
      expect(result.brand).toBeNull();
      expect(result.flavors).toEqual([]);
      expect(mockBrandService.getBrandBySlug).toHaveBeenCalledWith('nonexistent', false);
      expect(mockFlavorService.getFlavorsByBrand).not.toHaveBeenCalled();
    });

    it('should pass forceRefresh parameter to brandService', async () => {
      // Arrange
      const mockFlavors = [mockFlavor1];
      mockBrandService.getBrandBySlug.mockResolvedValue(mockBrand1);
      mockFlavorService.getFlavorsByBrand.mockResolvedValue(mockFlavors);

      // Act
      await dataService.getBrandWithFlavors('sarma', true);

      // Assert
      expect(mockBrandService.getBrandBySlug).toHaveBeenCalledWith('sarma', true);
    });

    it('should return null brand and empty flavors on error', async () => {
      // Arrange
      mockBrandService.getBrandBySlug.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await dataService.getBrandWithFlavors('sarma');

      // Assert
      expect(result.brand).toBeNull();
      expect(result.flavors).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get brand with flavors: sarma',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log error on failure', async () => {
      // Arrange
      mockBrandService.getBrandBySlug.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await dataService.getBrandWithFlavors('sarma');

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get brand with flavors: sarma',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================================
  // Search Operations Tests
  // ============================================================================

  describe('searchFlavors', () => {
    it('should search flavors by name (case-insensitive)', async () => {
      // Arrange
      const allFlavors = [mockFlavor1, mockFlavor2, mockFlavor3];
      mockFlavorService.getAllFlavors.mockResolvedValue(allFlavors);

      // Act
      const result = await dataService.searchFlavors('зима');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('sarma/klassicheskaya/zima');
    });

    it('should search flavors by nameAlt', async () => {
      // Arrange
      const allFlavors = [mockFlavor1, mockFlavor2, mockFlavor3];
      mockFlavorService.getAllFlavors.mockResolvedValue(allFlavors);

      // Act
      const result = await dataService.searchFlavors('summer');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('sarma/klassicheskaya/letnyaya');
    });

    it('should search flavors by description', async () => {
      // Arrange
      const allFlavors = [mockFlavor1, mockFlavor2, mockFlavor3];
      mockFlavorService.getAllFlavors.mockResolvedValue(allFlavors);

      // Act
      const result = await dataService.searchFlavors('mint');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('sarma/klassicheskaya/zima');
    });

    it('should search flavors by tags', async () => {
      // Arrange
      const allFlavors = [mockFlavor1, mockFlavor2, mockFlavor3];
      mockFlavorService.getAllFlavors.mockResolvedValue(allFlavors);

      // Act
      const result = await dataService.searchFlavors('холодок');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('sarma/klassicheskaya/zima');
    });

    it('should be case-insensitive', async () => {
      // Arrange
      const allFlavors = [mockFlavor1, mockFlavor2, mockFlavor3];
      mockFlavorService.getAllFlavors.mockResolvedValue(allFlavors);

      // Act
      const result = await dataService.searchFlavors('ЗИМА');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('sarma/klassicheskaya/zima');
    });

    it('should return all matching flavors', async () => {
      // Arrange
      const allFlavors = [mockFlavor1, mockFlavor2, mockFlavor3];
      mockFlavorService.getAllFlavors.mockResolvedValue(allFlavors);

      // Act
      const result = await dataService.searchFlavors('фрукты');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('sarma/klassicheskaya/letnyaya');
      expect(result[1].slug).toBe('dogma/premium/mango');
    });

    it('should return empty array when no matches', async () => {
      // Arrange
      const allFlavors = [mockFlavor1, mockFlavor2, mockFlavor3];
      mockFlavorService.getAllFlavors.mockResolvedValue(allFlavors);

      // Act
      const result = await dataService.searchFlavors('nonexistent');

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      // Arrange
      mockFlavorService.getAllFlavors.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await dataService.searchFlavors('test');

      // Assert
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to search flavors with query: test',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log error on failure', async () => {
      // Arrange
      mockFlavorService.getAllFlavors.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await dataService.searchFlavors('test');

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to search flavors with query: test',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle flavor with null nameAlt', async () => {
      // Arrange
      const allFlavors = [mockFlavor1];
      mockFlavorService.getAllFlavors.mockResolvedValue(allFlavors);

      // Act
      const result = await dataService.searchFlavors('зима');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('sarma/klassicheskaya/zima');
    });

    it('should handle flavor with null description', async () => {
      // Arrange
      const flavorWithoutDescription: Flavor = {
        ...mockFlavor1,
        description: "",
      };
      const allFlavors = [flavorWithoutDescription];
      mockFlavorService.getAllFlavors.mockResolvedValue(allFlavors);

      // Act
      const result = await dataService.searchFlavors('зима');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('sarma/klassicheskaya/zima');
    });

    it('should handle empty tags array', async () => {
      // Arrange
      const flavorWithoutTags: Flavor = {
        ...mockFlavor1,
        tags: [],
      };
      const allFlavors = [flavorWithoutTags];
      mockFlavorService.getAllFlavors.mockResolvedValue(allFlavors);

      // Act
      const result = await dataService.searchFlavors('зима');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('sarma/klassicheskaya/zima');
    });
  });

  // ============================================================================
  // Cache Management Tests
  // ============================================================================

  describe('refreshAllCache', () => {
    it('should refresh both brand and flavor caches', async () => {
      // Arrange
      mockBrandService.refreshBrandCache.mockResolvedValue();
      mockFlavorService.refreshFlavorCache.mockResolvedValue();

      // Act
      await dataService.refreshAllCache();

      // Assert
      expect(mockBrandService.refreshBrandCache).toHaveBeenCalled();
      expect(mockFlavorService.refreshFlavorCache).toHaveBeenCalled();
    });

    it('should complete when both refreshes succeed', async () => {
      // Arrange
      mockBrandService.refreshBrandCache.mockResolvedValue();
      mockFlavorService.refreshFlavorCache.mockResolvedValue();

      // Act & Assert
      await expect(dataService.refreshAllCache()).resolves.not.toThrow();
    });

    it('should throw error when brand refresh fails', async () => {
      // Arrange
      mockBrandService.refreshBrandCache.mockRejectedValue(new Error('Brand refresh error'));
      mockFlavorService.refreshFlavorCache.mockResolvedValue();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(dataService.refreshAllCache()).rejects.toThrow('Brand refresh error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh all cache:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should throw error when flavor refresh fails', async () => {
      // Arrange
      mockBrandService.refreshBrandCache.mockResolvedValue();
      mockFlavorService.refreshFlavorCache.mockRejectedValue(new Error('Flavor refresh error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(dataService.refreshAllCache()).rejects.toThrow('Flavor refresh error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh all cache:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should throw error when both refreshes fail', async () => {
      // Arrange
      mockBrandService.refreshBrandCache.mockRejectedValue(new Error('Brand error'));
      mockFlavorService.refreshFlavorCache.mockRejectedValue(new Error('Flavor error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(dataService.refreshAllCache()).rejects.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh all cache:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should log error on failure', async () => {
      // Arrange
      mockBrandService.refreshBrandCache.mockRejectedValue(new Error('Test error'));
      mockFlavorService.refreshFlavorCache.mockResolvedValue();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      try {
        await dataService.refreshAllCache();
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh all cache:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearAllCache', () => {
    it('should call refreshAllCache to clear and repopulate cache', async () => {
      // Arrange
      mockBrandService.refreshBrandCache.mockResolvedValue();
      mockFlavorService.refreshFlavorCache.mockResolvedValue();

      // Act
      await dataService.clearAllCache();

      // Assert
      expect(mockBrandService.refreshBrandCache).toHaveBeenCalled();
      expect(mockFlavorService.refreshFlavorCache).toHaveBeenCalled();
    });

    it('should throw error when refreshAllCache fails', async () => {
      // Arrange
      mockBrandService.refreshBrandCache.mockRejectedValue(new Error('Refresh error'));
      mockFlavorService.refreshFlavorCache.mockResolvedValue();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act & Assert
      await expect(dataService.clearAllCache()).rejects.toThrow('Refresh error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to clear all cache:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should log error on failure', async () => {
      // Arrange
      mockBrandService.refreshBrandCache.mockRejectedValue(new Error('Test error'));
      mockFlavorService.refreshFlavorCache.mockResolvedValue();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      try {
        await dataService.clearAllCache();
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to clear all cache:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================================
  // Health Check Tests
  // ============================================================================

  describe('getHealthStatus', () => {
    it('should return health status with cached flag true when data exists', async () => {
      // Arrange
      const mockBrands = [mockBrand1, mockBrand2];
      const mockFlavors = [mockFlavor1, mockFlavor2, mockFlavor3];
      mockBrandService.getAllBrands.mockResolvedValue(mockBrands);
      mockFlavorService.getAllFlavors.mockResolvedValue(mockFlavors);

      // Act
      const result = await dataService.getHealthStatus();

      // Assert
      expect(result.brands.cached).toBe(true);
      expect(result.brands.count).toBe(2);
      expect(result.flavors.cached).toBe(true);
      expect(result.flavors.count).toBe(3);
    });

    it('should return health status with cached flag false when no data', async () => {
      // Arrange
      mockBrandService.getAllBrands.mockResolvedValue([]);
      mockFlavorService.getAllFlavors.mockResolvedValue([]);

      // Act
      const result = await dataService.getHealthStatus();

      // Assert
      expect(result.brands.cached).toBe(false);
      expect(result.brands.count).toBe(0);
      expect(result.flavors.cached).toBe(false);
      expect(result.flavors.count).toBe(0);
    });

    it('should return correct counts', async () => {
      // Arrange
      const mockBrands = [mockBrand1, mockBrand2];
      const mockFlavors = [mockFlavor1, mockFlavor2];
      mockBrandService.getAllBrands.mockResolvedValue(mockBrands);
      mockFlavorService.getAllFlavors.mockResolvedValue(mockFlavors);

      // Act
      const result = await dataService.getHealthStatus();

      // Assert
      expect(result.brands.count).toBe(2);
      expect(result.flavors.count).toBe(2);
    });

    it('should return health status with cached flag false on error', async () => {
      // Arrange
      mockBrandService.getAllBrands.mockRejectedValue(new Error('Network error'));
      mockFlavorService.getAllFlavors.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await dataService.getHealthStatus();

      // Assert
      expect(result.brands.cached).toBe(false);
      expect(result.brands.count).toBe(0);
      expect(result.flavors.cached).toBe(false);
      expect(result.flavors.count).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get health status:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should log error on failure', async () => {
      // Arrange
      mockBrandService.getAllBrands.mockRejectedValue(new Error('Test error'));
      mockFlavorService.getAllFlavors.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      await dataService.getHealthStatus();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get health status:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should handle partial data (brands cached, flavors not)', async () => {
      // Arrange
      const mockBrands = [mockBrand1];
      mockBrandService.getAllBrands.mockResolvedValue(mockBrands);
      mockFlavorService.getAllFlavors.mockResolvedValue([]);

      // Act
      const result = await dataService.getHealthStatus();

      // Assert
      expect(result.brands.cached).toBe(true);
      expect(result.brands.count).toBe(1);
      expect(result.flavors.cached).toBe(false);
      expect(result.flavors.count).toBe(0);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    it('should handle multiple method calls with delegation', async () => {
      // Arrange
      const mockBrands = [mockBrand1, mockBrand2];
      const mockFlavors = [mockFlavor1, mockFlavor2, mockFlavor3];
      mockBrandService.getAllBrands.mockResolvedValue(mockBrands);
      mockBrandService.getBrandBySlug.mockResolvedValue(mockBrand1);
      mockBrandService.getBrandsByCountry.mockResolvedValue([mockBrand1, mockBrand2]);
      mockFlavorService.getAllFlavors.mockResolvedValue(mockFlavors);
      mockFlavorService.getFlavorBySlug.mockResolvedValue(mockFlavor1);
      mockFlavorService.getFlavorsByBrand.mockResolvedValue([mockFlavor1, mockFlavor2]);
      mockFlavorService.getFlavorsByLine.mockResolvedValue([mockFlavor1, mockFlavor2]);
      mockFlavorService.getFlavorsByTag.mockResolvedValue([mockFlavor1]);

      // Act
      const allBrands = await dataService.getAllBrands();
      const specificBrand = await dataService.getBrandBySlug('sarma');
      const russianBrands = await dataService.getBrandsByCountry('Россия');
      const allFlavors = await dataService.getAllFlavors();
      const specificFlavor = await dataService.getFlavorBySlug('sarma/klassicheskaya/zima');
      const sarmaFlavors = await dataService.getFlavorsByBrand('sarma');
      const classicFlavors = await dataService.getFlavorsByLine('klassicheskaya');
      const mintFlavors = await dataService.getFlavorsByTag('Холодок');

      // Assert
      expect(allBrands).toHaveLength(2);
      expect(specificBrand).toEqual(mockBrand1);
      expect(russianBrands).toHaveLength(2);
      expect(allFlavors).toHaveLength(3);
      expect(specificFlavor).toEqual(mockFlavor1);
      expect(sarmaFlavors).toHaveLength(2);
      expect(classicFlavors).toHaveLength(2);
      expect(mintFlavors).toHaveLength(1);
    });

    it('should handle getBrandWithFlavors followed by search', async () => {
      // Arrange
      const mockFlavors = [mockFlavor1, mockFlavor2];
      mockBrandService.getBrandBySlug.mockResolvedValue(mockBrand1);
      mockFlavorService.getFlavorsByBrand.mockResolvedValue(mockFlavors);
      mockFlavorService.getAllFlavors.mockResolvedValue(mockFlavors);

      // Act
      const brandWithFlavors = await dataService.getBrandWithFlavors('sarma');
      const searchResults = await dataService.searchFlavors('зима');

      // Assert
      expect(brandWithFlavors.brand).toEqual(mockBrand1);
      expect(brandWithFlavors.flavors).toHaveLength(2);
      expect(searchResults).toHaveLength(1);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty query in searchFlavors', async () => {
      // Arrange
      const allFlavors = [mockFlavor1, mockFlavor2];
      mockFlavorService.getAllFlavors.mockResolvedValue(allFlavors);

      // Act
      const result = await dataService.searchFlavors('');

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should handle whitespace in search query', async () => {
      // Arrange
      const allFlavors = [mockFlavor1, mockFlavor2];
      mockFlavorService.getAllFlavors.mockResolvedValue(allFlavors);

      // Act
      const result = await dataService.searchFlavors('   ');

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle special characters in search query', async () => {
      // Arrange
      const allFlavors = [mockFlavor1, mockFlavor2];
      mockFlavorService.getAllFlavors.mockResolvedValue(allFlavors);

      // Act
      const result = await dataService.searchFlavors('!@#$%^&*()');

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle very long search query', async () => {
      // Arrange
      const allFlavors = [mockFlavor1];
      mockFlavorService.getAllFlavors.mockResolvedValue(allFlavors);
      const longQuery = 'a'.repeat(1000);

      // Act
      const result = await dataService.searchFlavors(longQuery);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle empty slug in getBrandBySlug', async () => {
      // Arrange
      mockBrandService.getBrandBySlug.mockResolvedValue(null);

      // Act
      const result = await dataService.getBrandBySlug('');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle empty slug in getFlavorBySlug', async () => {
      // Arrange
      mockFlavorService.getFlavorBySlug.mockResolvedValue(null);

      // Act
      const result = await dataService.getFlavorBySlug('');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle empty brandSlug in getFlavorsByBrand', async () => {
      // Arrange
      mockFlavorService.getFlavorsByBrand.mockResolvedValue([]);

      // Act
      const result = await dataService.getFlavorsByBrand('');

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle empty lineSlug in getFlavorsByLine', async () => {
      // Arrange
      mockFlavorService.getFlavorsByLine.mockResolvedValue([]);

      // Act
      const result = await dataService.getFlavorsByLine('');

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle empty tag in getFlavorsByTag', async () => {
      // Arrange
      mockFlavorService.getFlavorsByTag.mockResolvedValue([]);

      // Act
      const result = await dataService.getFlavorsByTag('');

      // Assert
      expect(result).toEqual([]);
    });
  });
});
