/**
 * Duplicate Detector Tests
 *
 * Comprehensive test suite for duplicate detection module.
 * Tests cover basic functionality, counts, case insensitivity,
 * clear/reset, retrieval, edge cases, and integration scenarios.
 *
 * @module test/duplicate-detector
 */

import { describe, it, expect } from 'vitest';

import {
  createDuplicateDetector,
  addBrand,
  addProduct,
  hasBrand,
  hasProduct,
  getBrandCount,
  getProductCount,
  getProductCountByBrand,
  clear,
  getBrands,
  getProducts,
} from '../src/duplicate-detector.js';

import type { NormalizedBrand, NormalizedProduct } from '../src/types.js';

// Helper function to create a normalized brand
function createBrand(slug: string, name: string): NormalizedBrand {
  return {
    slug,
    name,
    sourceUrl: `https://example.com/${slug}`,
    scrapedAt: new Date().toISOString(),
  };
}

// Helper function to create a normalized product
function createProduct(brandSlug: string, productSlug: string, name: string): NormalizedProduct {
  return {
    slug: productSlug,
    name,
    brandSlug,
    sourceUrl: `https://example.com/${brandSlug}/${productSlug}`,
    scrapedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Basic Functionality Tests
// ============================================================================

describe('createDuplicateDetector()', () => {
  it('should create a new detector instance', () => {
    const detector = createDuplicateDetector();

    expect(detector).toBeDefined();
    expect(detector.brands).toBeInstanceOf(Set);
    expect(detector.products).toBeInstanceOf(Map);
    expect(detector.totalCount).toBe(0);
  });

  it('should create independent detector instances', () => {
    const detector1 = createDuplicateDetector();
    const detector2 = createDuplicateDetector();

    expect(detector1).not.toBe(detector2);
    expect(detector1.brands).not.toBe(detector2.brands);
    expect(detector1.products).not.toBe(detector2.products);
  });
});

describe('addBrand()', () => {
  it('should add brand and return false for new brand', () => {
    const detector = createDuplicateDetector();
    const brand = createBrand('al-fakher', 'Al Fakher');

    const result = addBrand(detector, brand);

    expect(result).toBe(false);
    expect(hasBrand(detector, 'al-fakher')).toBe(true);
    expect(detector.totalCount).toBe(1);
  });

  it('should return true for duplicate brand', () => {
    const detector = createDuplicateDetector();
    const brand = createBrand('al-fakher', 'Al Fakher');

    addBrand(detector, brand);
    const result = addBrand(detector, brand);

    expect(result).toBe(true);
    expect(detector.totalCount).toBe(1);
  });

  it('should add multiple unique brands', () => {
    const detector = createDuplicateDetector();

    expect(addBrand(detector, createBrand('al-fakher', 'Al Fakher'))).toBe(false);
    expect(addBrand(detector, createBrand('tangiers', 'Tangiers'))).toBe(false);
    expect(addBrand(detector, createBrand('sarma', 'Sarma'))).toBe(false);

    expect(getBrandCount(detector)).toBe(3);
  });

  it('should handle empty string slug', () => {
    const detector = createDuplicateDetector();
    const brand = createBrand('', 'Test Brand');

    const result = addBrand(detector, brand);

    expect(result).toBe(false);
    expect(hasBrand(detector, '')).toBe(true);
  });
});

describe('addProduct()', () => {
  it('should add product and return false for new product', () => {
    const detector = createDuplicateDetector();
    const product = createProduct('al-fakher', 'mint', 'Mint');

    const result = addProduct(detector, product);

    expect(result).toBe(false);
    expect(hasProduct(detector, 'mint', 'al-fakher')).toBe(true);
    expect(detector.totalCount).toBe(1);
  });

  it('should return true for duplicate product', () => {
    const detector = createDuplicateDetector();
    const product = createProduct('al-fakher', 'mint', 'Mint');

    addProduct(detector, product);
    const result = addProduct(detector, product);

    expect(result).toBe(true);
    expect(detector.totalCount).toBe(1);
  });

  it('should add products for different brands', () => {
    const detector = createDuplicateDetector();

    expect(addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'))).toBe(false);
    expect(addProduct(detector, createProduct('tangiers', 'mint', 'Mint'))).toBe(false);
    expect(addProduct(detector, createProduct('sarma', 'winter', 'Winter'))).toBe(false);

    expect(getProductCount(detector)).toBe(3);
  });

  it('should add multiple products for same brand', () => {
    const detector = createDuplicateDetector();

    expect(addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'))).toBe(false);
    expect(addProduct(detector, createProduct('al-fakher', 'grape', 'Grape'))).toBe(false);
    expect(addProduct(detector, createProduct('al-fakher', 'orange', 'Orange'))).toBe(false);

    expect(getProductCount(detector)).toBe(3);
    expect(getProductCountByBrand(detector, 'al-fakher')).toBe(3);
  });

  it('should handle empty string slugs', () => {
    const detector = createDuplicateDetector();
    const product = createProduct('', '', 'Test Product');

    const result = addProduct(detector, product);

    expect(result).toBe(false);
    expect(hasProduct(detector, '', '')).toBe(true);
  });
});

describe('hasBrand()', () => {
  it('should return true for existing brand', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));

    expect(hasBrand(detector, 'al-fakher')).toBe(true);
  });

  it('should return false for non-existing brand', () => {
    const detector = createDuplicateDetector();

    expect(hasBrand(detector, 'al-fakher')).toBe(false);
  });

  it('should return false after brand is added then cleared', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
    clear(detector);

    expect(hasBrand(detector, 'al-fakher')).toBe(false);
  });
});

describe('hasProduct()', () => {
  it('should return true for existing product', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));

    expect(hasProduct(detector, 'mint', 'al-fakher')).toBe(true);
  });

  it('should return false for non-existing product', () => {
    const detector = createDuplicateDetector();

    expect(hasProduct(detector, 'mint', 'al-fakher')).toBe(false);
  });

  it('should return false for product with different brand', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));

    expect(hasProduct(detector, 'mint', 'tangiers')).toBe(false);
  });

  it('should return false for product with different slug', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));

    expect(hasProduct(detector, 'grape', 'al-fakher')).toBe(false);
  });

  it('should return false after product is added then cleared', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    clear(detector);

    expect(hasProduct(detector, 'mint', 'al-fakher')).toBe(false);
  });
});

// ============================================================================
// Count Tests
// ============================================================================

describe('getBrandCount()', () => {
  it('should return correct brand count', () => {
    const detector = createDuplicateDetector();

    expect(getBrandCount(detector)).toBe(0);

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
    expect(getBrandCount(detector)).toBe(1);

    addBrand(detector, createBrand('tangiers', 'Tangiers'));
    expect(getBrandCount(detector)).toBe(2);

    addBrand(detector, createBrand('sarma', 'Sarma'));
    expect(getBrandCount(detector)).toBe(3);
  });

  it('should not count duplicate brands', () => {
    const detector = createDuplicateDetector();
    const brand = createBrand('al-fakher', 'Al Fakher');

    addBrand(detector, brand);
    addBrand(detector, brand);
    addBrand(detector, brand);

    expect(getBrandCount(detector)).toBe(1);
  });

  it('should return 0 for new detector', () => {
    const detector = createDuplicateDetector();

    expect(getBrandCount(detector)).toBe(0);
  });

  it('should return 0 after clearing', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
    addBrand(detector, createBrand('tangiers', 'Tangiers'));
    clear(detector);

    expect(getBrandCount(detector)).toBe(0);
  });
});

describe('getProductCount()', () => {
  it('should return correct total product count', () => {
    const detector = createDuplicateDetector();

    expect(getProductCount(detector)).toBe(0);

    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    expect(getProductCount(detector)).toBe(1);

    addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));
    expect(getProductCount(detector)).toBe(2);

    addProduct(detector, createProduct('sarma', 'winter', 'Winter'));
    expect(getProductCount(detector)).toBe(3);
  });

  it('should count products across all brands', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    addProduct(detector, createProduct('al-fakher', 'grape', 'Grape'));
    addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));
    addProduct(detector, createProduct('sarma', 'winter', 'Winter'));

    expect(getProductCount(detector)).toBe(4);
  });

  it('should not count duplicate products', () => {
    const detector = createDuplicateDetector();
    const product = createProduct('al-fakher', 'mint', 'Mint');

    addProduct(detector, product);
    addProduct(detector, product);
    addProduct(detector, product);

    expect(getProductCount(detector)).toBe(1);
  });

  it('should return 0 for new detector', () => {
    const detector = createDuplicateDetector();

    expect(getProductCount(detector)).toBe(0);
  });

  it('should return 0 after clearing', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));
    clear(detector);

    expect(getProductCount(detector)).toBe(0);
  });
});

describe('getProductCountByBrand()', () => {
  it('should return correct product count for specific brand', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    addProduct(detector, createProduct('al-fakher', 'grape', 'Grape'));
    addProduct(detector, createProduct('al-fakher', 'orange', 'Orange'));
    addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));

    expect(getProductCountByBrand(detector, 'al-fakher')).toBe(3);
    expect(getProductCountByBrand(detector, 'tangiers')).toBe(1);
  });

  it('should return 0 for non-existing brand', () => {
    const detector = createDuplicateDetector();

    expect(getProductCountByBrand(detector, 'al-fakher')).toBe(0);
  });

  it('should return 0 for brand with no products', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));

    expect(getProductCountByBrand(detector, 'al-fakher')).toBe(0);
  });

  it('should not count duplicate products for brand', () => {
    const detector = createDuplicateDetector();
    const product = createProduct('al-fakher', 'mint', 'Mint');

    addProduct(detector, product);
    addProduct(detector, product);
    addProduct(detector, createProduct('al-fakher', 'grape', 'Grape'));

    expect(getProductCountByBrand(detector, 'al-fakher')).toBe(2);
  });

  it('should return 0 after clearing', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    addProduct(detector, createProduct('al-fakher', 'grape', 'Grape'));
    clear(detector);

    expect(getProductCountByBrand(detector, 'al-fakher')).toBe(0);
  });
});

describe('totalCount', () => {
  it('should track all items correctly', () => {
    const detector = createDuplicateDetector();

    expect(detector.totalCount).toBe(0);

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
    expect(detector.totalCount).toBe(1);

    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    expect(detector.totalCount).toBe(2);

    addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));
    expect(detector.totalCount).toBe(3);

    addBrand(detector, createBrand('sarma', 'Sarma'));
    expect(detector.totalCount).toBe(4);
  });

  it('should count duplicate additions', () => {
    const detector = createDuplicateDetector();
    const brand = createBrand('al-fakher', 'Al Fakher');

    addBrand(detector, brand);
    addBrand(detector, brand);
    addBrand(detector, brand);

    expect(detector.totalCount).toBe(1);
  });

  it('should reset to 0 after clearing', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    clear(detector);

    expect(detector.totalCount).toBe(0);
  });
});

// ============================================================================
// Case Insensitivity Tests
// ============================================================================

describe('Case Insensitivity', () => {
  it('should detect brand duplicates case-insensitively', () => {
    const detector = createDuplicateDetector();

    expect(addBrand(detector, createBrand('Al-Fakher', 'Al Fakher'))).toBe(false);
    expect(addBrand(detector, createBrand('al-fakher', 'Al Fakher'))).toBe(true);
    expect(addBrand(detector, createBrand('AL-FAKHER', 'Al Fakher'))).toBe(true);
    expect(addBrand(detector, createBrand('aL-fAkHeR', 'Al Fakher'))).toBe(true);
  });

  it('should detect product duplicates case-insensitively', () => {
    const detector = createDuplicateDetector();

    expect(addProduct(detector, createProduct('Al-Fakher', 'Mint', 'Mint'))).toBe(false);
    expect(addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'))).toBe(true);
    expect(addProduct(detector, createProduct('AL-FAKHER', 'MINT', 'Mint'))).toBe(true);
    expect(addProduct(detector, createProduct('aL-fAkHeR', 'mInT', 'Mint'))).toBe(true);
  });

  it('should normalize brand slug to lowercase', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('Al-Fakher', 'Al Fakher'));

    expect(hasBrand(detector, 'al-fakher')).toBe(true);
    expect(hasBrand(detector, 'AL-FAKHER')).toBe(true);
    expect(hasBrand(detector, 'Al-Fakher')).toBe(true);
  });

  it('should normalize product slug to lowercase', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('Al-Fakher', 'Mint', 'Mint'));

    expect(hasProduct(detector, 'mint', 'al-fakher')).toBe(true);
    expect(hasProduct(detector, 'MINT', 'AL-FAKHER')).toBe(true);
    expect(hasProduct(detector, 'Mint', 'Al-Fakher')).toBe(true);
  });

  it('should store brands in lowercase', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('Al-Fakher', 'Al Fakher'));
    const brands = getBrands(detector);

    expect(brands).toContain('al-fakher');
    expect(brands).not.toContain('Al-Fakher');
  });

  it('should store products in lowercase', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('Al-Fakher', 'Mint', 'Mint'));
    const products = getProducts(detector);

    const alFakherProducts = products.filter(p => p.brandSlug === 'al-fakher');
    expect(alFakherProducts).toHaveLength(1);
    expect(alFakherProducts[0]?.slug).toBe('mint');
  });
});

// ============================================================================
// Clear and Reset Tests
// ============================================================================

describe('clear()', () => {
  it('should remove all brands', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
    addBrand(detector, createBrand('tangiers', 'Tangiers'));
    addBrand(detector, createBrand('sarma', 'Sarma'));

    expect(getBrandCount(detector)).toBe(3);

    clear(detector);

    expect(getBrandCount(detector)).toBe(0);
    expect(hasBrand(detector, 'al-fakher')).toBe(false);
    expect(hasBrand(detector, 'tangiers')).toBe(false);
    expect(hasBrand(detector, 'sarma')).toBe(false);
  });

  it('should remove all products', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));
    addProduct(detector, createProduct('sarma', 'winter', 'Winter'));

    expect(getProductCount(detector)).toBe(3);

    clear(detector);

    expect(getProductCount(detector)).toBe(0);
    expect(hasProduct(detector, 'mint', 'al-fakher')).toBe(false);
    expect(hasProduct(detector, 'mint', 'tangiers')).toBe(false);
    expect(hasProduct(detector, 'winter', 'sarma')).toBe(false);
  });

  it('should reset total count', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));

    expect(detector.totalCount).toBe(3);

    clear(detector);

    expect(detector.totalCount).toBe(0);
  });

  it('should clear both brands and products', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));

    clear(detector);

    expect(getBrandCount(detector)).toBe(0);
    expect(getProductCount(detector)).toBe(0);
    expect(detector.totalCount).toBe(0);
  });

  it('should be safe to call multiple times', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));

    clear(detector);
    clear(detector);
    clear(detector);

    expect(getBrandCount(detector)).toBe(0);
  });

  it('should be safe to call on empty detector', () => {
    const detector = createDuplicateDetector();

    expect(() => clear(detector)).not.toThrow();
    expect(getBrandCount(detector)).toBe(0);
    expect(getProductCount(detector)).toBe(0);
  });
});

describe('Detector reuse after clearing', () => {
  it('should allow adding brands after clearing', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
    clear(detector);

    expect(addBrand(detector, createBrand('tangiers', 'Tangiers'))).toBe(false);
    expect(getBrandCount(detector)).toBe(1);
  });

  it('should allow adding products after clearing', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    clear(detector);

    expect(addProduct(detector, createProduct('tangiers', 'mint', 'Mint'))).toBe(false);
    expect(getProductCount(detector)).toBe(1);
  });

  it('should reset duplicate detection after clearing', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
    clear(detector);

    expect(addBrand(detector, createBrand('al-fakher', 'Al Fakher'))).toBe(false);
  });

  it('should track new total count after clearing', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    clear(detector);

    addBrand(detector, createBrand('tangiers', 'Tangiers'));
    addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));

    expect(detector.totalCount).toBe(2);
  });
});

// ============================================================================
// Retrieval Tests
// ============================================================================

describe('getBrands()', () => {
  it('should return all brand slugs', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
    addBrand(detector, createBrand('tangiers', 'Tangiers'));
    addBrand(detector, createBrand('sarma', 'Sarma'));

    const brands = getBrands(detector);

    expect(brands).toHaveLength(3);
    expect(brands).toContain('al-fakher');
    expect(brands).toContain('tangiers');
    expect(brands).toContain('sarma');
  });

  it('should return empty array when no brands', () => {
    const detector = createDuplicateDetector();

    const brands = getBrands(detector);

    expect(brands).toEqual([]);
  });

  it('should return empty array after clearing', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
    addBrand(detector, createBrand('tangiers', 'Tangiers'));
    clear(detector);

    const brands = getBrands(detector);

    expect(brands).toEqual([]);
  });

  it('should return brands in lowercase', () => {
    const detector = createDuplicateDetector();

    addBrand(detector, createBrand('Al-Fakher', 'Al Fakher'));
    addBrand(detector, createBrand('Tangiers', 'Tangiers'));
    addBrand(detector, createBrand('SARMA', 'Sarma'));

    const brands = getBrands(detector);

    expect(brands).toContain('al-fakher');
    expect(brands).toContain('tangiers');
    expect(brands).toContain('sarma');
  });

  it('should not include duplicate brands', () => {
    const detector = createDuplicateDetector();
    const brand = createBrand('al-fakher', 'Al Fakher');

    addBrand(detector, brand);
    addBrand(detector, brand);
    addBrand(detector, brand);

    const brands = getBrands(detector);

    expect(brands).toHaveLength(1);
    expect(brands).toContain('al-fakher');
  });
});

describe('getProducts()', () => {
  it('should return all products with brand slugs', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    addProduct(detector, createProduct('al-fakher', 'grape', 'Grape'));
    addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));
    addProduct(detector, createProduct('sarma', 'winter', 'Winter'));

    const products = getProducts(detector);

    expect(products).toHaveLength(4);
    expect(products).toContainEqual({ brandSlug: 'al-fakher', slug: 'mint' });
    expect(products).toContainEqual({ brandSlug: 'al-fakher', slug: 'grape' });
    expect(products).toContainEqual({ brandSlug: 'tangiers', slug: 'mint' });
    expect(products).toContainEqual({ brandSlug: 'sarma', slug: 'winter' });
  });

  it('should return empty array when no products', () => {
    const detector = createDuplicateDetector();

    const products = getProducts(detector);

    expect(products).toEqual([]);
  });

  it('should return empty array after clearing', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
    addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));
    clear(detector);

    const products = getProducts(detector);

    expect(products).toEqual([]);
  });

  it('should return products in lowercase', () => {
    const detector = createDuplicateDetector();

    addProduct(detector, createProduct('Al-Fakher', 'Mint', 'Mint'));
    addProduct(detector, createProduct('Tangiers', 'MINT', 'Mint'));

    const products = getProducts(detector);

    expect(products).toContainEqual({ brandSlug: 'al-fakher', slug: 'mint' });
    expect(products).toContainEqual({ brandSlug: 'tangiers', slug: 'mint' });
  });

  it('should not include duplicate products', () => {
    const detector = createDuplicateDetector();
    const product = createProduct('al-fakher', 'mint', 'Mint');

    addProduct(detector, product);
    addProduct(detector, product);
    addProduct(detector, product);

    const products = getProducts(detector);

    expect(products).toHaveLength(1);
    expect(products).toContainEqual({ brandSlug: 'al-fakher', slug: 'mint' });
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('Edge Cases', () => {
  describe('Adding same brand multiple times', () => {
    it('should return false on first addition', () => {
      const detector = createDuplicateDetector();
      const brand = createBrand('al-fakher', 'Al Fakher');

      expect(addBrand(detector, brand)).toBe(false);
    });

    it('should return true on subsequent additions', () => {
      const detector = createDuplicateDetector();
      const brand = createBrand('al-fakher', 'Al Fakher');

      addBrand(detector, brand);
      expect(addBrand(detector, brand)).toBe(true);
      expect(addBrand(detector, brand)).toBe(true);
    });

    it('should not increase brand count', () => {
      const detector = createDuplicateDetector();
      const brand = createBrand('al-fakher', 'Al Fakher');

      addBrand(detector, brand);
      addBrand(detector, brand);
      addBrand(detector, brand);

      expect(getBrandCount(detector)).toBe(1);
    });

    it('should not increase total count', () => {
      const detector = createDuplicateDetector();
      const brand = createBrand('al-fakher', 'Al Fakher');

      addBrand(detector, brand);
      addBrand(detector, brand);
      addBrand(detector, brand);

      expect(detector.totalCount).toBe(1);
    });
  });

  describe('Adding same product multiple times', () => {
    it('should return false on first addition', () => {
      const detector = createDuplicateDetector();
      const product = createProduct('al-fakher', 'mint', 'Mint');

      expect(addProduct(detector, product)).toBe(false);
    });

    it('should return true on subsequent additions', () => {
      const detector = createDuplicateDetector();
      const product = createProduct('al-fakher', 'mint', 'Mint');

      addProduct(detector, product);
      expect(addProduct(detector, product)).toBe(true);
      expect(addProduct(detector, product)).toBe(true);
    });

    it('should not increase product count', () => {
      const detector = createDuplicateDetector();
      const product = createProduct('al-fakher', 'mint', 'Mint');

      addProduct(detector, product);
      addProduct(detector, product);
      addProduct(detector, product);

      expect(getProductCount(detector)).toBe(1);
    });

    it('should not increase total count', () => {
      const detector = createDuplicateDetector();
      const product = createProduct('al-fakher', 'mint', 'Mint');

      addProduct(detector, product);
      addProduct(detector, product);
      addProduct(detector, product);

      expect(detector.totalCount).toBe(1);
    });

    it('should not increase brand product count', () => {
      const detector = createDuplicateDetector();
      const product = createProduct('al-fakher', 'mint', 'Mint');

      addProduct(detector, product);
      addProduct(detector, product);
      addProduct(detector, product);

      expect(getProductCountByBrand(detector, 'al-fakher')).toBe(1);
    });
  });

  describe('Adding product for non-existing brand', () => {
    it('should add product successfully', () => {
      const detector = createDuplicateDetector();

      const result = addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));

      expect(result).toBe(false);
      expect(hasProduct(detector, 'mint', 'al-fakher')).toBe(true);
    });

    it('should not add brand', () => {
      const detector = createDuplicateDetector();

      addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));

      expect(hasBrand(detector, 'al-fakher')).toBe(false);
      expect(getBrandCount(detector)).toBe(0);
    });

    it('should count product', () => {
      const detector = createDuplicateDetector();

      addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));

      expect(getProductCount(detector)).toBe(1);
    });

    it('should count product for brand', () => {
      const detector = createDuplicateDetector();

      addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));

      expect(getProductCountByBrand(detector, 'al-fakher')).toBe(1);
    });
  });

  describe('Handling of empty slugs', () => {
    it('should handle empty brand slug', () => {
      const detector = createDuplicateDetector();

      expect(addBrand(detector, createBrand('', 'Test Brand'))).toBe(false);
      expect(hasBrand(detector, '')).toBe(true);
      expect(getBrandCount(detector)).toBe(1);
    });

    it('should handle empty product slug', () => {
      const detector = createDuplicateDetector();

      expect(addProduct(detector, createProduct('al-fakher', '', 'Test Product'))).toBe(false);
      expect(hasProduct(detector, '', 'al-fakher')).toBe(true);
      expect(getProductCount(detector)).toBe(1);
    });

    it('should handle empty brand and product slugs', () => {
      const detector = createDuplicateDetector();

      expect(addProduct(detector, createProduct('', '', 'Test Product'))).toBe(false);
      expect(hasProduct(detector, '', '')).toBe(true);
      expect(getProductCount(detector)).toBe(1);
    });

    it('should detect duplicate empty brand slug', () => {
      const detector = createDuplicateDetector();
      const brand = createBrand('', 'Test Brand');

      addBrand(detector, brand);
      expect(addBrand(detector, brand)).toBe(true);
    });

    it('should detect duplicate empty product slug', () => {
      const detector = createDuplicateDetector();
      const product = createProduct('al-fakher', '', 'Test Product');

      addProduct(detector, product);
      expect(addProduct(detector, product)).toBe(true);
    });
  });

  describe('Handling of special characters in slugs', () => {
    it('should handle hyphens in brand slug', () => {
      const detector = createDuplicateDetector();

      expect(addBrand(detector, createBrand('al-fakher-2024', 'Al Fakher 2024'))).toBe(false);
      expect(hasBrand(detector, 'al-fakher-2024')).toBe(true);
    });

    it('should handle underscores in brand slug', () => {
      const detector = createDuplicateDetector();

      expect(addBrand(detector, createBrand('al_fakher', 'Al Fakher'))).toBe(false);
      expect(hasBrand(detector, 'al_fakher')).toBe(true);
    });

    it('should handle numbers in brand slug', () => {
      const detector = createDuplicateDetector();

      expect(addBrand(detector, createBrand('brand123', 'Brand 123'))).toBe(false);
      expect(hasBrand(detector, 'brand123')).toBe(true);
    });

    it('should handle hyphens in product slug', () => {
      const detector = createDuplicateDetector();

      expect(addProduct(detector, createProduct('al-fakher', 'mint-2024', 'Mint 2024'))).toBe(false);
      expect(hasProduct(detector, 'mint-2024', 'al-fakher')).toBe(true);
    });

    it('should handle underscores in product slug', () => {
      const detector = createDuplicateDetector();

      expect(addProduct(detector, createProduct('al-fakher', 'mint_fresh', 'Mint Fresh'))).toBe(false);
      expect(hasProduct(detector, 'mint_fresh', 'al-fakher')).toBe(true);
    });

    it('should handle numbers in product slug', () => {
      const detector = createDuplicateDetector();

      expect(addProduct(detector, createProduct('al-fakher', 'mint123', 'Mint 123'))).toBe(false);
      expect(hasProduct(detector, 'mint123', 'al-fakher')).toBe(true);
    });

    it('should normalize special characters case-insensitively', () => {
      const detector = createDuplicateDetector();

      addBrand(detector, createBrand('Al-Fakher_2024', 'Al Fakher 2024'));
      expect(addBrand(detector, createBrand('al-fakher_2024', 'Al Fakher 2024'))).toBe(true);
      expect(addBrand(detector, createBrand('AL-FAKHER_2024', 'Al Fakher 2024'))).toBe(true);
    });
  });

  describe('Performance with large datasets', () => {
    it('should handle 100+ brands efficiently', () => {
      const detector = createDuplicateDetector();
      const brandCount = 100;

      for (let i = 0; i < brandCount; i++) {
        addBrand(detector, createBrand(`brand-${i}`, `Brand ${i}`));
      }

      expect(getBrandCount(detector)).toBe(brandCount);
      expect(detector.totalCount).toBe(brandCount);
    });

    it('should handle 1000+ products efficiently', () => {
      const detector = createDuplicateDetector();
      const productCount = 1000;

      for (let i = 0; i < productCount; i++) {
        const brandIndex = i % 10;
        addProduct(detector, createProduct(`brand-${brandIndex}`, `product-${i}`, `Product ${i}`));
      }

      expect(getProductCount(detector)).toBe(productCount);
      expect(detector.totalCount).toBe(productCount);
    });

    it('should handle 100+ brands and 1000+ products efficiently', () => {
      const detector = createDuplicateDetector();
      const brandCount = 100;
      const productCount = 1000;

      // Add brands
      for (let i = 0; i < brandCount; i++) {
        addBrand(detector, createBrand(`brand-${i}`, `Brand ${i}`));
      }

      // Add products
      for (let i = 0; i < productCount; i++) {
        const brandIndex = i % brandCount;
        addProduct(detector, createProduct(`brand-${brandIndex}`, `product-${i}`, `Product ${i}`));
      }

      expect(getBrandCount(detector)).toBe(brandCount);
      expect(getProductCount(detector)).toBe(productCount);
      expect(detector.totalCount).toBe(brandCount + productCount);
    });

    it('should efficiently check for duplicates in large dataset', () => {
      const detector = createDuplicateDetector();
      const brandCount = 100;

      // Add brands
      for (let i = 0; i < brandCount; i++) {
        addBrand(detector, createBrand(`brand-${i}`, `Brand ${i}`));
      }

      // Check for existing brand
      expect(hasBrand(detector, 'brand-50')).toBe(true);

      // Check for non-existing brand
      expect(hasBrand(detector, 'brand-999')).toBe(false);
    });

    it('should efficiently retrieve all brands in large dataset', () => {
      const detector = createDuplicateDetector();
      const brandCount = 100;

      for (let i = 0; i < brandCount; i++) {
        addBrand(detector, createBrand(`brand-${i}`, `Brand ${i}`));
      }

      const brands = getBrands(detector);

      expect(brands).toHaveLength(brandCount);
    });

    it('should efficiently retrieve all products in large dataset', () => {
      const detector = createDuplicateDetector();
      const productCount = 1000;

      for (let i = 0; i < productCount; i++) {
        const brandIndex = i % 10;
        addProduct(detector, createProduct(`brand-${brandIndex}`, `product-${i}`, `Product ${i}`));
      }

      const products = getProducts(detector);

      expect(products).toHaveLength(productCount);
    });

    it('should efficiently clear large dataset', () => {
      const detector = createDuplicateDetector();
      const brandCount = 100;
      const productCount = 1000;

      for (let i = 0; i < brandCount; i++) {
        addBrand(detector, createBrand(`brand-${i}`, `Brand ${i}`));
      }

      for (let i = 0; i < productCount; i++) {
        const brandIndex = i % brandCount;
        addProduct(detector, createProduct(`brand-${brandIndex}`, `product-${i}`, `Product ${i}`));
      }

      clear(detector);

      expect(getBrandCount(detector)).toBe(0);
      expect(getProductCount(detector)).toBe(0);
      expect(detector.totalCount).toBe(0);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration Tests', () => {
  describe('Complete workflow of adding multiple brands and products', () => {
    it('should handle realistic scraping workflow', () => {
      const detector = createDuplicateDetector();

      // Simulate first scraping iteration
      expect(addBrand(detector, createBrand('al-fakher', 'Al Fakher'))).toBe(false);
      expect(addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'))).toBe(false);
      expect(addProduct(detector, createProduct('al-fakher', 'grape', 'Grape'))).toBe(false);
      expect(addProduct(detector, createProduct('al-fakher', 'orange', 'Orange'))).toBe(false);

      expect(addBrand(detector, createBrand('tangiers', 'Tangiers'))).toBe(false);
      expect(addProduct(detector, createProduct('tangiers', 'mint', 'Mint'))).toBe(false);
      expect(addProduct(detector, createProduct('tangiers', 'birch', 'Birch'))).toBe(false);

      expect(addBrand(detector, createBrand('sarma', 'Sarma'))).toBe(false);
      expect(addProduct(detector, createProduct('sarma', 'winter', 'Winter'))).toBe(false);
      expect(addProduct(detector, createProduct('sarma', 'summer', 'Summer'))).toBe(false);

      expect(getBrandCount(detector)).toBe(3);
      expect(getProductCount(detector)).toBe(7);
      expect(detector.totalCount).toBe(10);

      // Simulate second scraping iteration (duplicates)
      expect(addBrand(detector, createBrand('al-fakher', 'Al Fakher'))).toBe(true);
      expect(addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'))).toBe(true);
      expect(addProduct(detector, createProduct('al-fakher', 'grape', 'Grape'))).toBe(true);
      expect(addProduct(detector, createProduct('al-fakher', 'orange', 'Orange'))).toBe(true);

      expect(addBrand(detector, createBrand('tangiers', 'Tangiers'))).toBe(true);
      expect(addProduct(detector, createProduct('tangiers', 'mint', 'Mint'))).toBe(true);
      expect(addProduct(detector, createProduct('tangiers', 'birch', 'Birch'))).toBe(true);

      expect(addBrand(detector, createBrand('sarma', 'Sarma'))).toBe(true);
      expect(addProduct(detector, createProduct('sarma', 'winter', 'Winter'))).toBe(true);
      expect(addProduct(detector, createProduct('sarma', 'summer', 'Summer'))).toBe(true);

      // Counts should remain the same
      expect(getBrandCount(detector)).toBe(3);
      expect(getProductCount(detector)).toBe(7);
      expect(detector.totalCount).toBe(10);
    });

    it('should handle adding new brands and products in subsequent iterations', () => {
      const detector = createDuplicateDetector();

      // First iteration
      addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
      addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
      addProduct(detector, createProduct('al-fakher', 'grape', 'Grape'));

      expect(getBrandCount(detector)).toBe(1);
      expect(getProductCount(detector)).toBe(2);

      // Second iteration - add new brand
      expect(addBrand(detector, createBrand('tangiers', 'Tangiers'))).toBe(false);
      expect(addProduct(detector, createProduct('tangiers', 'mint', 'Mint'))).toBe(false);
      expect(addProduct(detector, createProduct('tangiers', 'birch', 'Birch'))).toBe(false);

      expect(getBrandCount(detector)).toBe(2);
      expect(getProductCount(detector)).toBe(4);

      // Third iteration - add new products to existing brand
      expect(addBrand(detector, createBrand('al-fakher', 'Al Fakher'))).toBe(true);
      expect(addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'))).toBe(true);
      expect(addProduct(detector, createProduct('al-fakher', 'grape', 'Grape'))).toBe(true);
      expect(addProduct(detector, createProduct('al-fakher', 'orange', 'Orange'))).toBe(false); // New product

      expect(getBrandCount(detector)).toBe(2);
      expect(getProductCount(detector)).toBe(5);
    });
  });

  describe('Duplicate detection across multiple iterations', () => {
    it('should track duplicate additions across iterations', () => {
      const detector = createDuplicateDetector();

      // Iteration 1
      addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
      addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));

      // Iteration 2
      addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
      addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));

      // Iteration 3
      addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
      addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));

      // Iteration 4
      addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
      addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));

      expect(getBrandCount(detector)).toBe(1);
      expect(getProductCount(detector)).toBe(1);
      expect(detector.totalCount).toBe(2);
    });

    it('should allow adding new items after duplicates', () => {
      const detector = createDuplicateDetector();

      // Add and duplicate
      addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
      addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
      addBrand(detector, createBrand('al-fakher', 'Al Fakher'));

      // Add new brand
      expect(addBrand(detector, createBrand('tangiers', 'Tangiers'))).toBe(false);

      expect(getBrandCount(detector)).toBe(2);
    });
  });

  describe('Tracking products across different brands', () => {
    it('should track same product slug across different brands', () => {
      const detector = createDuplicateDetector();

      expect(addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'))).toBe(false);
      expect(addProduct(detector, createProduct('tangiers', 'mint', 'Mint'))).toBe(false);
      expect(addProduct(detector, createProduct('sarma', 'mint', 'Mint'))).toBe(false);

      expect(getProductCount(detector)).toBe(3);
      expect(getProductCountByBrand(detector, 'al-fakher')).toBe(1);
      expect(getProductCountByBrand(detector, 'tangiers')).toBe(1);
      expect(getProductCountByBrand(detector, 'sarma')).toBe(1);
    });

    it('should detect duplicates within same brand', () => {
      const detector = createDuplicateDetector();

      expect(addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'))).toBe(false);
      expect(addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'))).toBe(true);
      expect(addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'))).toBe(true);

      expect(getProductCount(detector)).toBe(1);
      expect(getProductCountByBrand(detector, 'al-fakher')).toBe(1);
    });

    it('should not detect duplicates across different brands', () => {
      const detector = createDuplicateDetector();

      expect(addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'))).toBe(false);
      expect(addProduct(detector, createProduct('tangiers', 'mint', 'Mint'))).toBe(false);

      expect(getProductCount(detector)).toBe(2);
    });

    it('should retrieve products organized by brand', () => {
      const detector = createDuplicateDetector();

      addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
      addProduct(detector, createProduct('al-fakher', 'grape', 'Grape'));
      addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));
      addProduct(detector, createProduct('sarma', 'winter', 'Winter'));

      const products = getProducts(detector);

      const alFakherProducts = products.filter(p => p.brandSlug === 'al-fakher');
      const tangiersProducts = products.filter(p => p.brandSlug === 'tangiers');
      const sarmaProducts = products.filter(p => p.brandSlug === 'sarma');

      expect(alFakherProducts).toHaveLength(2);
      expect(tangiersProducts).toHaveLength(1);
      expect(sarmaProducts).toHaveLength(1);
    });
  });

  describe('Combined brand and product operations', () => {
    it('should handle mixed brand and product additions', () => {
      const detector = createDuplicateDetector();

      // Add brand and products
      addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
      addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
      addProduct(detector, createProduct('al-fakher', 'grape', 'Grape'));

      // Add another brand and products
      addBrand(detector, createBrand('tangiers', 'Tangiers'));
      addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));

      // Add products for first brand
      addProduct(detector, createProduct('al-fakher', 'orange', 'Orange'));

      expect(getBrandCount(detector)).toBe(2);
      expect(getProductCount(detector)).toBe(4);
      expect(detector.totalCount).toBe(6);
    });

    it('should correctly count after mixed operations', () => {
      const detector = createDuplicateDetector();

      addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
      addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
      addBrand(detector, createBrand('tangiers', 'Tangiers'));
      addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));
      addProduct(detector, createProduct('al-fakher', 'grape', 'Grape'));

      expect(getBrandCount(detector)).toBe(2);
      expect(getProductCount(detector)).toBe(3);
      expect(getProductCountByBrand(detector, 'al-fakher')).toBe(2);
      expect(getProductCountByBrand(detector, 'tangiers')).toBe(1);
      expect(detector.totalCount).toBe(5);
    });

    it('should handle checking existence after mixed operations', () => {
      const detector = createDuplicateDetector();

      addBrand(detector, createBrand('al-fakher', 'Al Fakher'));
      addProduct(detector, createProduct('al-fakher', 'mint', 'Mint'));
      addBrand(detector, createBrand('tangiers', 'Tangiers'));
      addProduct(detector, createProduct('tangiers', 'mint', 'Mint'));

      expect(hasBrand(detector, 'al-fakher')).toBe(true);
      expect(hasBrand(detector, 'tangiers')).toBe(true);
      expect(hasBrand(detector, 'sarma')).toBe(false);

      expect(hasProduct(detector, 'mint', 'al-fakher')).toBe(true);
      expect(hasProduct(detector, 'mint', 'tangiers')).toBe(true);
      expect(hasProduct(detector, 'grape', 'al-fakher')).toBe(false);
      expect(hasProduct(detector, 'grape', 'tangiers')).toBe(false);
    });
  });
});
