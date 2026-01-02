/**
 * Duplicate Detection Module
 *
 * Provides efficient duplicate detection for brands and products across multiple
 * scraping iterations. Uses Set and Map data structures for O(1) lookups.
 *
 * @module duplicate-detector
 */

import type { NormalizedBrand, NormalizedProduct } from './types.js';

/**
 * Duplicate detector interface for tracking brands and products
 */
export interface DuplicateDetector {
  /** Set of brand slugs (case-insensitive) */
  brands: Set<string>;
  /** Map of brand slugs to product slug sets (case-insensitive) */
  products: Map<string, Set<string>>;
  /** Total count of all items tracked (brands + products) */
  totalCount: number;
}

/**
 * Normalize slug to lowercase for case-insensitive comparison
 *
 * @param slug - Slug to normalize
 * @returns Normalized lowercase slug
 */
function normalizeSlug(slug: string): string {
  return slug.toLowerCase().trim();
}

/**
 * Create a new duplicate detector instance
 *
 * @returns A new duplicate detector with empty tracking sets
 *
 * @example
 * ```ts
 * const detector = createDuplicateDetector();
 * ```
 */
export function createDuplicateDetector(): DuplicateDetector {
  return {
    brands: new Set<string>(),
    products: new Map<string, Set<string>>(),
    totalCount: 0,
  };
}

/**
 * Add a brand to the detector and check if it's a duplicate
 *
 * @param detector - The duplicate detector instance
 * @param brand - Normalized brand to add
 * @returns true if the brand is a duplicate (already tracked), false if it's new
 *
 * @example
 * ```ts
 * const detector = createDuplicateDetector();
 * const brand = normalizeBrandData({ name: 'Al Fakher', sourceUrl: '...' });
 * const isDuplicate = addBrand(detector, brand);
 * if (!isDuplicate) {
 *   // Process new brand
 * }
 * ```
 */
export function addBrand(detector: DuplicateDetector, brand: NormalizedBrand): boolean {
  const normalizedSlug = normalizeSlug(brand.slug);

  // Check if brand already exists
  if (detector.brands.has(normalizedSlug)) {
    return true; // It's a duplicate
  }

  // Add the brand
  detector.brands.add(normalizedSlug);
  detector.totalCount++;

  return false; // Not a duplicate
}

/**
 * Add a product to the detector and check if it's a duplicate
 *
 * @param detector - The duplicate detector instance
 * @param product - Normalized product to add
 * @returns true if the product is a duplicate (already tracked), false if it's new
 *
 * @example
 * ```ts
 * const detector = createDuplicateDetector();
 * const product = normalizeProductData({ name: 'Mint', brandSlug: 'al-fakher', sourceUrl: '...' });
 * const isDuplicate = addProduct(detector, product);
 * if (!isDuplicate) {
 *   // Process new product
 * }
 * ```
 */
export function addProduct(detector: DuplicateDetector, product: NormalizedProduct): boolean {
  const normalizedBrandSlug = normalizeSlug(product.brandSlug);
  const normalizedProductSlug = normalizeSlug(product.slug);

  // Get or create the product set for this brand
  let productSet = detector.products.get(normalizedBrandSlug);
  if (!productSet) {
    productSet = new Set<string>();
    detector.products.set(normalizedBrandSlug, productSet);
  }

  // Check if product already exists for this brand
  if (productSet.has(normalizedProductSlug)) {
    return true; // It's a duplicate
  }

  // Add the product
  productSet.add(normalizedProductSlug);
  detector.totalCount++;

  return false; // Not a duplicate
}

/**
 * Check if a brand exists in the detector
 *
 * @param detector - The duplicate detector instance
 * @param slug - Brand slug to check
 * @returns true if the brand is tracked, false otherwise
 *
 * @example
 * ```ts
 * const detector = createDuplicateDetector();
 * if (hasBrand(detector, 'al-fakher')) {
 *   console.log('Brand already processed');
 * }
 * ```
 */
export function hasBrand(detector: DuplicateDetector, slug: string): boolean {
  return detector.brands.has(normalizeSlug(slug));
}

/**
 * Check if a product exists in the detector
 *
 * @param detector - The duplicate detector instance
 * @param slug - Product slug to check
 * @param brandSlug - Brand slug the product belongs to
 * @returns true if the product is tracked, false otherwise
 *
 * @example
 * ```ts
 * const detector = createDuplicateDetector();
 * if (hasProduct(detector, 'mint', 'al-fakher')) {
 *   console.log('Product already processed');
 * }
 * ```
 */
export function hasProduct(detector: DuplicateDetector, slug: string, brandSlug: string): boolean {
  const normalizedBrandSlug = normalizeSlug(brandSlug);
  const normalizedProductSlug = normalizeSlug(slug);

  const productSet = detector.products.get(normalizedBrandSlug);
  return productSet ? productSet.has(normalizedProductSlug) : false;
}

/**
 * Get the total count of tracked brands
 *
 * @param detector - The duplicate detector instance
 * @returns Number of unique brands tracked
 *
 * @example
 * ```ts
 * const detector = createDuplicateDetector();
 * console.log(`Tracking ${getBrandCount(detector)} brands`);
 * ```
 */
export function getBrandCount(detector: DuplicateDetector): number {
  return detector.brands.size;
}

/**
 * Get the total count of tracked products
 *
 * @param detector - The duplicate detector instance
 * @returns Number of unique products tracked
 *
 * @example
 * ```ts
 * const detector = createDuplicateDetector();
 * console.log(`Tracking ${getProductCount(detector)} products`);
 * ```
 */
export function getProductCount(detector: DuplicateDetector): number {
  let total = 0;
  for (const productSet of detector.products.values()) {
    total += productSet.size;
  }
  return total;
}

/**
 * Get the product count for a specific brand
 *
 * @param detector - The duplicate detector instance
 * @param brandSlug - Brand slug to get product count for
 * @returns Number of products tracked for the specified brand
 *
 * @example
 * ```ts
 * const detector = createDuplicateDetector();
 * const count = getProductCountByBrand(detector, 'al-fakher');
 * console.log(`Al Fakher has ${count} products`);
 * ```
 */
export function getProductCountByBrand(detector: DuplicateDetector, brandSlug: string): number {
  const normalizedBrandSlug = normalizeSlug(brandSlug);
  const productSet = detector.products.get(normalizedBrandSlug);
  return productSet ? productSet.size : 0;
}

/**
 * Clear all tracked items from the detector
 *
 * @param detector - The duplicate detector instance
 *
 * @example
 * ```ts
 * const detector = createDuplicateDetector();
 * // ... add items ...
 * clear(detector); // Reset for new scraping session
 * ```
 */
export function clear(detector: DuplicateDetector): void {
  detector.brands.clear();
  detector.products.clear();
  detector.totalCount = 0;
}

/**
 * Get all tracked brand slugs
 *
 * @param detector - The duplicate detector instance
 * @returns Array of brand slugs in the order they were added (as a new array)
 *
 * @example
 * ```ts
 * const detector = createDuplicateDetector();
 * const brands = getBrands(detector);
 * console.log('Tracked brands:', brands);
 * ```
 */
export function getBrands(detector: DuplicateDetector): string[] {
  return Array.from(detector.brands);
}

/**
 * Get all tracked products with their associated brand slugs
 *
 * @param detector - The duplicate detector instance
 * @returns Array of objects containing slug and brandSlug for each product
 *
 * @example
 * ```ts
 * const detector = createDuplicateDetector();
 * const products = getProducts(detector);
 * products.forEach(({ slug, brandSlug }) => {
 *   console.log(`${brandSlug}/${slug}`);
 * });
 * ```
 */
export function getProducts(detector: DuplicateDetector): Array<{ slug: string; brandSlug: string }> {
  const result: Array<{ slug: string; brandSlug: string }> = [];

  for (const [brandSlug, productSet] of detector.products.entries()) {
    for (const productSlug of productSet) {
      result.push({
        slug: productSlug,
        brandSlug,
      });
    }
  }

  return result;
}
