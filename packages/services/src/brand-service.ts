/**
 * Brand Service
 * 
 * Orchestrates brand data retrieval using cache-aside pattern.
 * Coordinates between scraper and cache layers for brand-related operations.
 */

import { Brand } from '@hookah-db/types';
import { scrapeBrandsList, scrapeBrandDetails } from '@hookah-db/scraper';
import { ICache } from '@hookah-db/cache';
import { LoggerFactory } from '@hookah-db/utils';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('brand-service');

// ============================================================================
// Constants
// ============================================================================

const CACHE_TTL = 86400; // 24 hours in seconds

// ============================================================================
// Brand Service Implementation
// ============================================================================

/**
 * BrandService implements cache-aside pattern for brand data.
 * 
 * This service provides methods to retrieve brand data, with intelligent caching
 * to minimize scraping operations. It follows the cache-aside pattern:
 * - Check cache first
 * - On cache miss, scrape data and populate cache
 * - Handle errors gracefully by falling back to stale cache data
 */
export class BrandService {
  private cache: ICache;
  private brandScraper: typeof scrapeBrandsList;
  private brandDetailsScraper: typeof scrapeBrandDetails;

  /**
   * Create a new BrandService instance
   * 
   * @param cache Cache instance for storing brand data
   * @param brandScraper Function to scrape brand list
   * @param brandDetailsScraper Function to scrape brand details
   */
  constructor(
    cache: ICache,
    brandScraper: typeof scrapeBrandsList,
    brandDetailsScraper: typeof scrapeBrandDetails
  ) {
    this.cache = cache;
    this.brandScraper = brandScraper;
    this.brandDetailsScraper = brandDetailsScraper;
  }

  /**
   * Get all brands with caching
   * 
   * Implements cache-aside pattern:
   * - If forceRefresh is false, check cache first
   * - If cache miss or forceRefresh, scrape all brands
   * - Store results in cache with 24-hour TTL
   * 
   * @param forceRefresh If true, bypass cache and force scraping
   * @returns Promise resolving to array of Brand objects
   */
  async getAllBrands(forceRefresh = false): Promise<Brand[]> {
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedBrands = this.cache.getBrands();
      if (cachedBrands && cachedBrands.length > 0) {
        return cachedBrands;
      }
    }

    // Cache miss or force refresh - scrape data
    try {
      const brandSummaries = await this.brandScraper();
      
      // Convert BrandSummary[] to Brand[] by adding missing fields
      const brands: Brand[] = brandSummaries.map(summary => ({
        slug: summary.slug,
        name: summary.name,
        nameEn: summary.nameEn,
        description: summary.description,
        country: summary.country,
        website: null, // Not available in brand list
        foundedYear: null, // Not available in brand list
        status: '', // Not available in brand list
        imageUrl: summary.imageUrl,
        rating: summary.rating,
        ratingsCount: summary.ratingsCount,
        reviewsCount: summary.reviewsCount,
        viewsCount: summary.viewsCount,
        lines: [], // Will be populated by brand details scraper
        flavors: [], // Will be populated separately
      }));

      // Store in cache with 24-hour TTL
      this.cache.setBrands(brands, CACHE_TTL);
      
      return brands;
    } catch (error) {
      logger.error('Failed to scrape brands list', { error } as any);
      
      // Fall back to cached data if available
      const cachedBrands = this.cache.getBrands();
      if (cachedBrands && cachedBrands.length > 0) {
        logger.warn('Returning stale cached brands data' as any);
        return cachedBrands;
      }
      
      // Return empty array on complete failure
      return [];
    }
  }

  /**
   * Get a specific brand by slug with caching
   * 
   * Implements cache-aside pattern:
   * - If forceRefresh is false, check cache first
   * - If cache miss or forceRefresh, scrape brand details
   * - Store result in cache with 24-hour TTL
   * 
   * @param slug Brand slug (e.g., "sarma")
   * @param forceRefresh If true, bypass cache and force scraping
   * @returns Promise resolving to Brand object or null if not found
   */
  async getBrandBySlug(slug: string, forceRefresh = false): Promise<Brand | null> {
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedBrand = this.cache.getBrand(slug);
      if (cachedBrand) {
        return cachedBrand;
      }
    }

    // Cache miss or force refresh - scrape data
    try {
      const brand = await this.brandDetailsScraper(slug);
      
      if (brand) {
        // Store in cache with 24-hour TTL
        this.cache.setBrand(brand, CACHE_TTL);
        return brand;
      }
      
      // Brand not found
      return null;
    } catch (error) {
      logger.error('Failed to scrape brand details', { slug, error } as any);
      
      // Fall back to cached data if available
      const cachedBrand = this.cache.getBrand(slug);
      if (cachedBrand) {
        logger.warn('Returning stale cached brand data', { slug } as any);
        return cachedBrand;
      }
      
      // Return null on complete failure
      return null;
    }
  }

  /**
   * Get brands filtered by country
   * 
   * Retrieves all brands (from cache or scrape) and filters by country.
   * Country comparison is case-insensitive.
   * 
   * @param country Country name to filter by (e.g., "Россия", "USA")
   * @returns Promise resolving to array of Brand objects matching the country
   */
  async getBrandsByCountry(country: string): Promise<Brand[]> {
    try {
      const allBrands = await this.getAllBrands();
      
      // Filter brands by country (case-insensitive)
      const filteredBrands = allBrands.filter(
        brand => brand.country.toLowerCase() === country.toLowerCase()
      );
      
      return filteredBrands;
    } catch (error) {
      logger.error('Failed to get brands by country', { country, error } as any);
      return [];
    }
  }

  /**
   * Refresh all brands in cache
   * 
   * Forces a refresh of all brand data by bypassing cache and scraping.
   * This updates the cache with fresh data.
   * 
   * @returns Promise that resolves when cache refresh is complete
   */
  async refreshBrandCache(): Promise<void> {
    try {
      // Force refresh by passing true to getAllBrands
      await this.getAllBrands(true);
    } catch (error) {
      logger.error('Failed to refresh brand cache', { error } as any);
      throw error;
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export default BrandService;
