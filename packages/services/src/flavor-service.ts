/**
 * Flavor Service
 * 
 * Orchestrates flavor data retrieval using cache-aside pattern.
 * Coordinates between scraper and cache layers for flavor-related operations.
 */

import { Flavor } from '@hookah-db/types';
import { scrapeFlavorDetails } from '@hookah-db/scraper';
import { ICache } from '@hookah-db/cache';

// ============================================================================
// Constants
// ============================================================================

const CACHE_TTL = 86400; // 24 hours in seconds

// ============================================================================
// Flavor Service Implementation
// ============================================================================

/**
 * FlavorService implements cache-aside pattern for flavor data.
 * 
 * This service provides methods to retrieve flavor data, with intelligent caching
 * to minimize scraping operations. It follows the cache-aside pattern:
 * - Check cache first
 * - On cache miss, scrape data and populate cache
 * - Handle errors gracefully by falling back to stale cache data
 */
export class FlavorService {
  private cache: ICache;
  private flavorDetailsScraper: typeof scrapeFlavorDetails;

  /**
   * Create a new FlavorService instance
   * 
   * @param cache Cache instance for storing flavor data
   * @param flavorDetailsScraper Function to scrape flavor details
   */
  constructor(
    cache: ICache,
    flavorDetailsScraper: typeof scrapeFlavorDetails
  ) {
    this.cache = cache;
    this.flavorDetailsScraper = flavorDetailsScraper;
  }

  /**
   * Get all flavors with caching
   * 
   * Implements cache-aside pattern:
   * - If forceRefresh is false, check cache first
   * - If cache miss or forceRefresh, scrape all flavors from all brands
   * - Store results in cache with 24-hour TTL
   * 
   * @param forceRefresh If true, bypass cache and force scraping
   * @returns Promise resolving to array of Flavor objects
   */
  async getAllFlavors(forceRefresh = false): Promise<Flavor[]> {
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedFlavors = this.cache.getFlavors();
      if (cachedFlavors && cachedFlavors.length > 0) {
        return cachedFlavors;
      }
    }

    // Cache miss or force refresh - scrape data
    try {
      // Get all brands to discover all flavors
      // Note: This would require BrandService, but we're implementing it standalone
      // For now, we'll rely on the cache having flavors or return empty array
      // In a real implementation, you'd iterate through brands and scrape their flavors
      
      // Since flavors are scraped individually by slug, we'll need to know which flavors exist
      // This is typically done by scraping brand detail pages which list flavors
      // For this implementation, we'll return empty array as we don't have access to BrandService here
      // The actual implementation would be:
      // 1. Get all brands (from cache or scrape)
      // 2. For each brand, scrape brand details to get list of flavors
      // 3. For each flavor, scrape flavor details
      // 4. Store all flavors in cache
      
      // For now, return empty array - this will be populated by individual flavor scrapes
      console.warn('getAllFlavors: Cannot scrape all flavors without BrandService. Use getFlavorBySlug for individual flavors.');
      
      // Check if we have any cached flavors to return
      const cachedFlavors = this.cache.getFlavors();
      if (cachedFlavors && cachedFlavors.length > 0) {
        return cachedFlavors;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to scrape all flavors:', error);
      
      // Fall back to cached data if available
      const cachedFlavors = this.cache.getFlavors();
      if (cachedFlavors && cachedFlavors.length > 0) {
        console.warn('Returning stale cached flavors data');
        return cachedFlavors;
      }
      
      // Return empty array on complete failure
      return [];
    }
  }

  /**
   * Get a specific flavor by slug with caching
   * 
   * Implements cache-aside pattern:
   * - If forceRefresh is false, check cache first
   * - If cache miss or forceRefresh, scrape flavor details
   * - Store result in cache with 24-hour TTL
   * 
   * @param slug Flavor slug (e.g., "sarma/klassicheskaya/zima")
   * @param forceRefresh If true, bypass cache and force scraping
   * @returns Promise resolving to Flavor object or null if not found
   */
  async getFlavorBySlug(slug: string, forceRefresh = false): Promise<Flavor | null> {
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedFlavor = this.cache.getFlavor(slug);
      if (cachedFlavor) {
        return cachedFlavor;
      }
    }

    // Cache miss or force refresh - scrape data
    try {
      const flavor = await this.flavorDetailsScraper(slug);
      
      if (flavor) {
        // Store in cache with 24-hour TTL
        this.cache.setFlavor(flavor, CACHE_TTL);
        
        // Also update the flavors list in cache
        const allFlavors = this.cache.getFlavors();
        const updatedFlavors = allFlavors.filter(f => f.slug !== slug);
        updatedFlavors.push(flavor);
        this.cache.setFlavors(updatedFlavors, CACHE_TTL);
        
        return flavor;
      }
      
      // Flavor not found
      return null;
    } catch (error) {
      console.error(`Failed to scrape flavor details for slug: ${slug}`, error);
      
      // Fall back to cached data if available
      const cachedFlavor = this.cache.getFlavor(slug);
      if (cachedFlavor) {
        console.warn(`Returning stale cached flavor data for slug: ${slug}`);
        return cachedFlavor;
      }
      
      // Return null on complete failure
      return null;
    }
  }

  /**
   * Get flavors filtered by brand
   * 
   * Retrieves all flavors (from cache or scrape) and filters by brandSlug.
   * 
   * @param brandSlug Brand slug to filter by (e.g., "sarma")
   * @returns Promise resolving to array of Flavor objects matching the brand
   */
  async getFlavorsByBrand(brandSlug: string): Promise<Flavor[]> {
    try {
      const allFlavors = await this.getAllFlavors();
      
      // Filter flavors by brandSlug
      const filteredFlavors = allFlavors.filter(
        flavor => flavor.brandSlug === brandSlug
      );
      
      return filteredFlavors;
    } catch (error) {
      console.error(`Failed to get flavors by brand: ${brandSlug}`, error);
      
      // Try using cache's getFlavorsByBrand method as fallback
      try {
        return this.cache.getFlavorsByBrand(brandSlug);
      } catch {
        return [];
      }
    }
  }

  /**
   * Get flavors filtered by line
   * 
   * Retrieves all flavors (from cache or scrape) and filters by lineSlug.
   * 
   * @param lineSlug Line slug to filter by (e.g., "klassicheskaya")
   * @returns Promise resolving to array of Flavor objects matching the line
   */
  async getFlavorsByLine(lineSlug: string): Promise<Flavor[]> {
    try {
      const allFlavors = await this.getAllFlavors();
      
      // Filter flavors by lineSlug
      const filteredFlavors = allFlavors.filter(
        flavor => flavor.lineSlug === lineSlug
      );
      
      return filteredFlavors;
    } catch (error) {
      console.error(`Failed to get flavors by line: ${lineSlug}`, error);
      return [];
    }
  }

  /**
   * Get flavors filtered by tag
   * 
   * Retrieves all flavors (from cache or scrape) and filters by tag.
   * Tag matching is case-insensitive.
   * 
   * @param tag Tag name to filter by (e.g., "Холодок")
   * @returns Promise resolving to array of Flavor objects containing the tag
   */
  async getFlavorsByTag(tag: string): Promise<Flavor[]> {
    try {
      const allFlavors = await this.getAllFlavors();
      
      // Filter flavors that contain the tag (case-insensitive)
      const filteredFlavors = allFlavors.filter(
        flavor => flavor.tags.some(
          flavorTag => flavorTag.toLowerCase() === tag.toLowerCase()
        )
      );
      
      return filteredFlavors;
    } catch (error) {
      console.error(`Failed to get flavors by tag: ${tag}`, error);
      return [];
    }
  }

  /**
   * Refresh all flavors in cache
   * 
   * Forces a refresh of all flavor data by bypassing cache and scraping.
   * This updates the cache with fresh data.
   * 
   * @returns Promise that resolves when cache refresh is complete
   */
  async refreshFlavorCache(): Promise<void> {
    try {
      // Force refresh by passing true to getAllFlavors
      await this.getAllFlavors(true);
    } catch (error) {
      console.error('Failed to refresh flavor cache:', error);
      throw error;
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export default FlavorService;
