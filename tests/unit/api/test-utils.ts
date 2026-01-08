/**
 * Test utilities for API tests
 * Provides mock services and test setup helpers
 */

import { Brand } from '../../../src/types';
import { Flavor } from '../../../src/types';

// ============================================================================
// Mock Data
// ============================================================================

export const mockBrand: Brand = {
  slug: 'test-brand',
  name: 'Test Brand',
  nameEn: 'Test Brand',
  description: 'Test brand description',
  country: 'Россия',
  website: 'https://test-brand.com',
  foundedYear: 2020,
  status: 'Выпускается',
  imageUrl: 'https://example.com/brand.jpg',
  rating: 4.5,
  ratingsCount: 100,
  reviewsCount: 80,
  viewsCount: 1000,
  lines: [],
  flavors: [],
};

export const mockFlavor: Flavor = {
  slug: 'test-flavor',
  name: 'Test Flavor',
  nameAlt: null,
  description: 'Test flavor description',
  brandSlug: 'test-brand',
  brandName: 'Test Brand',
  lineSlug: 'test-line',
  lineName: 'Test Line',
  country: 'Россия',
  officialStrength: 'Средняя',
  userStrength: 'Средняя',
  status: 'Выпускается',
  imageUrl: 'https://example.com/flavor.jpg',
  tags: ['Холодок'],
  rating: 4.5,
  ratingsCount: 50,
  reviewsCount: 40,
  viewsCount: 500,
  ratingDistribution: {
    count1: 1,
    count2: 2,
    count3: 5,
    count4: 10,
    count5: 32,
  },
  smokeAgainPercentage: 85,
  htreviewsId: 12345,
  dateAdded: new Date('2024-01-01'),
  addedBy: 'test-user',
};

export const mockBrands: Brand[] = [
  mockBrand,
  {
    ...mockBrand,
    slug: 'test-brand-2',
    name: 'Test Brand 2',
    nameEn: 'Test Brand 2',
  },
];

export const mockFlavors: Flavor[] = [
  mockFlavor,
  {
    ...mockFlavor,
    slug: 'test-flavor-2',
    name: 'Test Flavor 2',
  },
];

// ============================================================================
// Mock Service Classes
// ============================================================================

export class MockBrandService {
  getBrandBySlug = jest.fn().mockImplementation(async (slug: string) => {
    if (slug === 'nonexistent') {
      return null;
    }
    return mockBrand;
  });

  getAllBrands = jest.fn().mockResolvedValue(mockBrands);

  getBrands = jest.fn().mockImplementation(async (params: any) => {
    const page = params.page || 1;
    const limit = params.limit || 20;
    return {
      data: mockBrands,
      pagination: {
        page,
        limit,
        total: mockBrands.length,
        totalPages: Math.ceil(mockBrands.length / limit),
      },
    };
  });

  getBrandsByCountry = jest.fn().mockImplementation(async (country: string, params: any) => {
    const page = params.page || 1;
    const limit = params.limit || 20;
    return {
      data: mockBrands,
      pagination: {
        page,
        limit,
        total: mockBrands.length,
        totalPages: Math.ceil(mockBrands.length / limit),
      },
    };
  });

  refreshBrands = jest.fn().mockResolvedValue({ success: true, count: mockBrands.length });
}

export class MockFlavorService {
  getFlavorBySlug = jest.fn().mockImplementation(async (slug: string) => {
    if (slug === 'nonexistent') {
      return null;
    }
    return mockFlavor;
  });

  getAllFlavors = jest.fn().mockResolvedValue(mockFlavors);

  getFlavors = jest.fn().mockImplementation(async (params: any) => {
    const page = params.page || 1;
    const limit = params.limit || 20;
    return {
      data: mockFlavors,
      pagination: {
        page,
        limit,
        total: mockFlavors.length,
        totalPages: Math.ceil(mockFlavors.length / limit),
      },
    };
  });

  getFlavorsByBrand = jest.fn().mockImplementation(async (brandSlug: string, params: any) => {
    const page = params.page || 1;
    const limit = params.limit || 20;
    return {
      data: mockFlavors,
      pagination: {
        page,
        limit,
        total: mockFlavors.length,
        totalPages: Math.ceil(mockFlavors.length / limit),
      },
    };
  });

  refreshFlavors = jest.fn().mockResolvedValue({ success: true, count: mockFlavors.length });
}

export class MockDataService {
  refreshAllData = jest.fn().mockResolvedValue({ success: true });
  getCacheStats = jest.fn().mockResolvedValue({
    size: 100,
    keys: 50,
    hits: 1000,
    misses: 100,
    hitRate: 0.91,
  });
}

// ============================================================================
// Mock Cache
// ============================================================================

export class MockCache {
  get = jest.fn().mockResolvedValue(null);
  set = jest.fn().mockResolvedValue(true);
  delete = jest.fn().mockResolvedValue(true);
  has = jest.fn().mockResolvedValue(false);
  clear = jest.fn().mockResolvedValue(undefined);
  flush = jest.fn().mockResolvedValue(undefined);
  keys = jest.fn().mockResolvedValue([]);
  size = jest.fn().mockResolvedValue(0);
  getStats = jest.fn().mockResolvedValue({
    size: 0,
    keys: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
  });
}

// ============================================================================
// Test Environment Setup
// ============================================================================

export function setupTestEnvironment() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.API_KEY_TEST = 'test-api-key';
  process.env.API_KEY_CLIENT1 = 'client1-key';
  process.env.API_KEY_CLIENT2 = 'client2-key';
  process.env.RATE_LIMIT_MAX = '1000';
  process.env.RATE_LIMIT_WINDOW = '60000';
}

export function cleanupTestEnvironment() {
  // Clean up environment variables if needed
  delete process.env.NODE_ENV;
  delete process.env.API_KEY_TEST;
  delete process.env.API_KEY_CLIENT1;
  delete process.env.API_KEY_CLIENT2;
  delete process.env.RATE_LIMIT_MAX;
  delete process.env.RATE_LIMIT_WINDOW;
}
