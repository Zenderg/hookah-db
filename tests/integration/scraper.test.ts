/**
 * Integration tests for Scraper
 * 
 * These tests make real HTTP requests to htreviews.org to verify
 * that scraper works in practice with live data.
 * 
 * IMPORTANT: These tests are skipped by default and only run when
 * INTEGRATION_TESTS environment variable is set to "true".
 * 
 * To run integration tests:
 *   INTEGRATION_TESTS=true pnpm test tests/integration/scraper.test.ts
 * 
 * Note: These tests make real HTTP requests to htreviews.org and should
 * be run sparingly to be respectful of their server resources.
 */

import {
  scrapeBrandsList,
  scrapeBrandDetails,
  scrapeFlavorDetails,
} from '../../src/scraper';
import type { BrandSummary } from '../../src/scraper';
import type { Brand, Flavor } from '../../src/types';

// ============================================================================
// Test Configuration
// ============================================================================

// Test brands and flavors known to exist on htreviews.org
const TEST_BRAND_SLUG = 'sarma';
const TEST_FLAVOR_SLUG = 'sarma/klassicheskaya/zima';
const TEST_FLAVOR_NAME = 'Зима';

// Check if integration tests should run
const shouldRunIntegrationTests = process.env.INTEGRATION_TESTS === 'true';

if (!shouldRunIntegrationTests) {
  console.warn('\n⚠️  Integration tests are skipped. Set INTEGRATION_TESTS=true to enable them.');
  console.warn('   Example: INTEGRATION_TESTS=true pnpm test tests/integration/scraper.test.ts\n');
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Scraper Integration Tests', () => {
  
  // ============================================================================
  // Brand List Scraper Integration Tests
  // ============================================================================
  
  describe('Brand List Scraper', () => {
    
    it('should scrape brands list from htreviews.org', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const startTime = Date.now();
      const brands = await scrapeBrandsList();
      const duration = Date.now() - startTime;
      
      console.log(`\n  ✅ Scraped ${brands.length} brands in ${duration}ms`);
      
      // Verify that brands are returned
      expect(brands.length).toBeGreaterThan(0);
      
      // Verify that brand data structure is correct
      const firstBrand = brands[0];
      expect(firstBrand).toHaveProperty('slug');
      expect(firstBrand).toHaveProperty('name');
      expect(firstBrand).toHaveProperty('nameEn');
      expect(firstBrand).toHaveProperty('country');
      expect(firstBrand).toHaveProperty('rating');
      expect(firstBrand).toHaveProperty('ratingsCount');
      expect(firstBrand).toHaveProperty('reviewsCount');
      expect(firstBrand).toHaveProperty('viewsCount');
      expect(firstBrand).toHaveProperty('description');
      
      // Verify data types
      expect(typeof firstBrand.slug).toBe('string');
      expect(typeof firstBrand.name).toBe('string');
      expect(typeof firstBrand.nameEn).toBe('string');
      expect(typeof firstBrand.country).toBe('string');
      expect(typeof firstBrand.rating).toBe('number');
      expect(typeof firstBrand.ratingsCount).toBe('number');
      expect(typeof firstBrand.reviewsCount).toBe('number');
      expect(typeof firstBrand.viewsCount).toBe('number');
      expect(typeof firstBrand.description).toBe('string');
      
      // Verify rating is within valid range
      expect(firstBrand.rating).toBeGreaterThanOrEqual(0);
      expect(firstBrand.rating).toBeLessThanOrEqual(5);
      
      // Verify counts are non-negative
      expect(firstBrand.ratingsCount).toBeGreaterThanOrEqual(0);
      expect(firstBrand.reviewsCount).toBeGreaterThanOrEqual(0);
      expect(firstBrand.viewsCount).toBeGreaterThanOrEqual(0);
    }, 60000); // 60 second timeout
    
    it('should verify known brands exist in scraped list', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const brands = await scrapeBrandsList();
      
      const brandSlugs = brands.map((b: BrandSummary) => b.slug);
      
      // Verify some well-known brands are present
      expect(brandSlugs).toContain('sarma');
      expect(brandSlugs).toContain('dogma');
      expect(brandSlugs).toContain('darkside');
      expect(brandSlugs).toContain('tangiers');
    }, 60000);
    
    it('should verify brand data is consistent', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const brands = await scrapeBrandsList();
      
      // Verify all brands have required fields
      brands.forEach((brand: BrandSummary) => {
        expect(brand.slug).toBeTruthy();
        expect(brand.name).toBeTruthy();
        expect(brand.country).toBeTruthy();
        expect(brand.rating).toBeGreaterThanOrEqual(0);
        expect(brand.rating).toBeLessThanOrEqual(5);
        expect(brand.ratingsCount).toBeGreaterThanOrEqual(0);
        expect(brand.reviewsCount).toBeGreaterThanOrEqual(0);
        expect(brand.viewsCount).toBeGreaterThanOrEqual(0);
      });
    }, 60000);
    
    it('should handle rate limiting properly', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      // Make multiple requests to test rate limiting
      const requests = Array(3).fill(null).map(() => scrapeBrandsList());
      
      const results = await Promise.all(requests);
      
      // All requests should succeed
      results.forEach(brands => {
        expect(brands.length).toBeGreaterThan(0);
      });
    }, 90000); // 90 second timeout for multiple requests
    
    it('should handle network errors gracefully', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      // This test verifies scraper doesn't crash on network errors
      // We can't easily simulate network errors in integration tests,
      // but we can verify scraper returns empty array on failure
      
      // Note: This is more of a documentation test showing expected behavior
      // In real scenarios, network errors should return empty array
      const brands = await scrapeBrandsList();
      
      // Should either return brands or empty array, never throw
      expect(Array.isArray(brands)).toBe(true);
    }, 60000);
  });
  
  // ============================================================================
  // Brand Details Scraper Integration Tests
  // ============================================================================
  
  describe('Brand Details Scraper', () => {
    
    it('should scrape brand details for Sarma', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const startTime = Date.now();
      const brand = await scrapeBrandDetails(TEST_BRAND_SLUG);
      const duration = Date.now() - startTime;
      
      console.log(`\n  ✅ Scraped brand details for "${TEST_BRAND_SLUG}" in ${duration}ms`);
      
      // Verify brand is returned
      expect(brand).toBeDefined();
      if (!brand) {
        return;
      }
      
      // Verify all brand fields are extracted
      expect(brand).toHaveProperty('slug');
      expect(brand).toHaveProperty('name');
      expect(brand).toHaveProperty('nameEn');
      expect(brand).toHaveProperty('description');
      expect(brand).toHaveProperty('country');
      expect(brand).toHaveProperty('website');
      expect(brand).toHaveProperty('foundedYear');
      expect(brand).toHaveProperty('status');
      expect(brand).toHaveProperty('imageUrl');
      expect(brand).toHaveProperty('rating');
      expect(brand).toHaveProperty('ratingsCount');
      expect(brand).toHaveProperty('reviewsCount');
      expect(brand).toHaveProperty('viewsCount');
      expect(brand).toHaveProperty('lines');
      expect(brand).toHaveProperty('flavors');
      
      // Verify specific values for Sarma
      expect(brand.slug).toBe(TEST_BRAND_SLUG);
      expect(brand.name).toBe('Сарма');
      expect(brand.country).toBe('Россия');
      expect(brand.rating).toBeGreaterThan(0);
      expect(brand.rating).toBeLessThanOrEqual(5);
      
      // Verify lines are extracted
      expect(Array.isArray(brand.lines)).toBe(true);
      expect(brand.lines.length).toBeGreaterThan(0);
      
      // Verify first line has required fields
      if (brand.lines.length > 0) {
        const firstLine = brand.lines[0];
        expect(firstLine).toHaveProperty('slug');
        expect(firstLine).toHaveProperty('name');
        expect(firstLine).toHaveProperty('brandSlug');
      }
    }, 60000);
    
    it('should scrape brand details for Dogma', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const brand = await scrapeBrandDetails('dogma');
      
      expect(brand).toBeDefined();
      if (!brand) {
        return;
      }
      
      expect(brand.slug).toBe('dogma');
      expect(brand.name).toBe('Догма');
      expect(brand.country).toBe('Россия');
      
      // Verify lines are extracted
      expect(brand.lines.length).toBeGreaterThan(0);
    }, 60000);
    
    it('should scrape brand details for DARKSIDE', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const brand = await scrapeBrandDetails('darkside');
      
      expect(brand).toBeDefined();
      if (!brand) {
        return;
      }
      
      expect(brand.slug).toBe('darkside');
      expect(brand.name).toBe('DARKSIDE');
      expect(brand.country).toBe('Россия');
      
      // Verify lines are extracted
      expect(brand.lines.length).toBeGreaterThan(0);
    }, 60000);
    
    it('should verify brand with many lines', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      // Test with a brand known to have many lines
      const brand = await scrapeBrandDetails('darkside');
      
      expect(brand).toBeDefined();
      if (!brand) {
        return;
      }
      
      expect(brand.lines.length).toBeGreaterThan(5); // DARKSIDE has many lines
      
      // Verify all lines have required fields
      brand.lines.forEach(line => {
        expect(line).toHaveProperty('slug');
        expect(line).toHaveProperty('name');
        expect(line).toHaveProperty('brandSlug');
        expect(line.brandSlug).toBe(brand.slug);
      });
    }, 60000);
    
    it('should handle non-existent brand gracefully', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      // Test with a brand that doesn't exist
      const brand = await scrapeBrandDetails('non-existent-brand-12345');
      
      // Should return null or throw appropriate error
      expect(brand).toBeNull();
    }, 60000);
    
    it('should verify brand data structure matches Brand type', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const brand = await scrapeBrandDetails(TEST_BRAND_SLUG);
      
      expect(brand).toBeDefined();
      if (!brand) {
        return;
      }
      
      // Verify all optional fields are either present or null
      expect(brand.website === null || typeof brand.website === 'string').toBe(true);
      expect(brand.foundedYear === null || typeof brand.foundedYear === 'number').toBe(true);
      expect(brand.imageUrl === null || typeof brand.imageUrl === 'string').toBe(true);
      
      // Verify required fields are present
      expect(typeof brand.slug).toBe('string');
      expect(typeof brand.name).toBe('string');
      expect(typeof brand.nameEn).toBe('string');
      expect(typeof brand.description).toBe('string');
      expect(typeof brand.country).toBe('string');
      expect(typeof brand.status).toBe('string');
      expect(typeof brand.rating).toBe('number');
      expect(typeof brand.ratingsCount).toBe('number');
      expect(typeof brand.reviewsCount).toBe('number');
      expect(typeof brand.viewsCount).toBe('number');
    }, 60000);
  });
  
  // ============================================================================
  // Flavor Details Scraper Integration Tests
  // ============================================================================
  
  describe('Flavor Details Scraper', () => {
    
    it('should scrape flavor details for Sarma Klassicheskaya Zima', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const startTime = Date.now();
      const flavor = await scrapeFlavorDetails(TEST_FLAVOR_SLUG);
      const duration = Date.now() - startTime;
      
      console.log(`\n  ✅ Scraped flavor details for "${TEST_FLAVOR_SLUG}" in ${duration}ms`);
      
      // Verify flavor is returned
      expect(flavor).toBeDefined();
      if (!flavor) {
        return;
      }
      
      // Verify all flavor fields are extracted
      expect(flavor).toHaveProperty('slug');
      expect(flavor).toHaveProperty('name');
      expect(flavor).toHaveProperty('nameAlt');
      expect(flavor).toHaveProperty('description');
      expect(flavor).toHaveProperty('brandSlug');
      expect(flavor).toHaveProperty('brandName');
      expect(flavor).toHaveProperty('lineSlug');
      expect(flavor).toHaveProperty('lineName');
      expect(flavor).toHaveProperty('country');
      expect(flavor).toHaveProperty('officialStrength');
      expect(flavor).toHaveProperty('userStrength');
      expect(flavor).toHaveProperty('status');
      expect(flavor).toHaveProperty('imageUrl');
      expect(flavor).toHaveProperty('tags');
      expect(flavor).toHaveProperty('rating');
      expect(flavor).toHaveProperty('ratingsCount');
      expect(flavor).toHaveProperty('reviewsCount');
      expect(flavor).toHaveProperty('viewsCount');
      expect(flavor).toHaveProperty('ratingDistribution');
      expect(flavor).toHaveProperty('smokeAgainPercentage');
      expect(flavor).toHaveProperty('htreviewsId');
      expect(flavor).toHaveProperty('dateAdded');
      expect(flavor).toHaveProperty('addedBy');
      
      // Verify specific values
      expect(flavor.slug).toBe('zima');
      expect(flavor.name).toBe(TEST_FLAVOR_NAME);
      expect(flavor.brandSlug).toBe('sarma');
      expect(flavor.brandName).toBe('Сарма');
      expect(flavor.lineSlug).toBe('klassicheskaya');
      expect(flavor.lineName).toBe('Классическая');
      expect(flavor.country).toBe('Россия');
      
      // Verify rating is within valid range
      expect(flavor.rating).toBeGreaterThanOrEqual(0);
      expect(flavor.rating).toBeLessThanOrEqual(5);
      
      // Verify tags are extracted
      expect(Array.isArray(flavor.tags)).toBe(true);
      expect(flavor.tags.length).toBeGreaterThan(0);
      
      // Verify rating distribution is present
      expect(flavor.ratingDistribution).toBeDefined();
      expect(flavor.ratingDistribution).toHaveProperty('count1');
      expect(flavor.ratingDistribution).toHaveProperty('count2');
      expect(flavor.ratingDistribution).toHaveProperty('count3');
      expect(flavor.ratingDistribution).toHaveProperty('count4');
      expect(flavor.ratingDistribution).toHaveProperty('count5');
    }, 60000);
    
    it('should scrape flavor details for Dogma flavor', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const flavor = await scrapeFlavorDetails('dogma/berry/berry');
      
      expect(flavor).toBeDefined();
      if (!flavor) {
        return;
      }
      
      expect(flavor.brandSlug).toBe('dogma');
      expect(flavor.brandName).toBe('Догма');
      expect(flavor.lineSlug).toBe('berry');
      
      // Verify tags are extracted
      expect(Array.isArray(flavor.tags)).toBe(true);
    }, 60000);
    
    it('should verify tags are extracted correctly', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const flavor = await scrapeFlavorDetails(TEST_FLAVOR_SLUG);
      
      expect(flavor).toBeDefined();
      if (!flavor) {
        return;
      }
      
      // Verify tags array
      expect(Array.isArray(flavor.tags)).toBe(true);
      expect(flavor.tags.length).toBeGreaterThan(0);
      
      // Verify each tag is a string
      flavor.tags.forEach(tag => {
        expect(typeof tag).toBe('string');
        expect(tag.length).toBeGreaterThan(0);
      });
      
      // Verify expected tags for Zima flavor
      expect(flavor.tags).toContain('Холодок');
    }, 60000);
    
    it('should verify flavor with many tags', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      // Test with a flavor known to have many tags
      const flavor = await scrapeFlavorDetails('dogma/berry/berry');
      
      expect(flavor).toBeDefined();
      if (!flavor) {
        return;
      }
      
      expect(flavor.tags.length).toBeGreaterThan(0);
      
      // Verify all tags are strings
      flavor.tags.forEach(tag => {
        expect(typeof tag).toBe('string');
      });
    }, 60000);
    
    it('should verify rating distribution structure', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const flavor = await scrapeFlavorDetails(TEST_FLAVOR_SLUG);
      
      expect(flavor).toBeDefined();
      if (!flavor) {
        return;
      }
      
      const ratingDist = flavor.ratingDistribution;
      
      // Verify rating distribution has all keys
      expect(ratingDist).toHaveProperty('count1');
      expect(ratingDist).toHaveProperty('count2');
      expect(ratingDist).toHaveProperty('count3');
      expect(ratingDist).toHaveProperty('count4');
      expect(ratingDist).toHaveProperty('count5');
      
      // Verify all values are numbers
      expect(typeof ratingDist.count1).toBe('number');
      expect(typeof ratingDist.count2).toBe('number');
      expect(typeof ratingDist.count3).toBe('number');
      expect(typeof ratingDist.count4).toBe('number');
      expect(typeof ratingDist.count5).toBe('number');
      
      // Verify values are non-negative
      expect(ratingDist.count1).toBeGreaterThanOrEqual(0);
      expect(ratingDist.count2).toBeGreaterThanOrEqual(0);
      expect(ratingDist.count3).toBeGreaterThanOrEqual(0);
      expect(ratingDist.count4).toBeGreaterThanOrEqual(0);
      expect(ratingDist.count5).toBeGreaterThanOrEqual(0);
    }, 60000);
    
    it('should verify smoke again percentage', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const flavor = await scrapeFlavorDetails(TEST_FLAVOR_SLUG);
      
      expect(flavor).toBeDefined();
      if (!flavor) {
        return;
      }
      
      // Verify smoke again percentage is a number
      expect(typeof flavor.smokeAgainPercentage).toBe('number');
      
      // Verify it's within valid range (0-100)
      expect(flavor.smokeAgainPercentage).toBeGreaterThanOrEqual(0);
      expect(flavor.smokeAgainPercentage).toBeLessThanOrEqual(100);
    }, 60000);
    
    it('should verify htreviewsId and dateAdded', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const flavor = await scrapeFlavorDetails(TEST_FLAVOR_SLUG);
      
      expect(flavor).toBeDefined();
      if (!flavor) {
        return;
      }
      
      // Verify htreviewsId is a positive number
      expect(typeof flavor.htreviewsId).toBe('number');
      expect(flavor.htreviewsId).toBeGreaterThan(0);
      
      // Verify dateAdded is a Date object
      expect(flavor.dateAdded).toBeInstanceOf(Date);
      expect(flavor.dateAdded.getTime()).toBeGreaterThan(0);
      
      // Verify addedBy is a string
      expect(typeof flavor.addedBy).toBe('string');
      expect(flavor.addedBy.length).toBeGreaterThan(0);
    }, 60000);
    
    it('should handle non-existent flavor gracefully', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      // Test with a flavor that doesn't exist
      const flavor = await scrapeFlavorDetails('non-existent/brand/flavor');
      
      // Should return null or throw appropriate error
      expect(flavor).toBeNull();
    }, 60000);
    
    it('should verify flavor data structure matches Flavor type', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const flavor = await scrapeFlavorDetails(TEST_FLAVOR_SLUG);
      
      expect(flavor).toBeDefined();
      if (!flavor) {
        return;
      }
      
      // Verify optional fields are either present or null
      expect(flavor.nameAlt === null || typeof flavor.nameAlt === 'string').toBe(true);
      expect(flavor.lineSlug === null || typeof flavor.lineSlug === 'string').toBe(true);
      expect(flavor.lineName === null || typeof flavor.lineName === 'string').toBe(true);
      expect(flavor.officialStrength === null || typeof flavor.officialStrength === 'string').toBe(true);
      expect(flavor.userStrength === null || typeof flavor.userStrength === 'string').toBe(true);
      expect(flavor.imageUrl === null || typeof flavor.imageUrl === 'string').toBe(true);
      
      // Verify required fields are present
      expect(typeof flavor.slug).toBe('string');
      expect(typeof flavor.name).toBe('string');
      expect(typeof flavor.description).toBe('string');
      expect(typeof flavor.brandSlug).toBe('string');
      expect(typeof flavor.brandName).toBe('string');
      expect(typeof flavor.country).toBe('string');
      expect(typeof flavor.status).toBe('string');
      expect(typeof flavor.rating).toBe('number');
      expect(typeof flavor.ratingsCount).toBe('number');
      expect(typeof flavor.reviewsCount).toBe('number');
      expect(typeof flavor.viewsCount).toBe('number');
      expect(typeof flavor.smokeAgainPercentage).toBe('number');
      expect(typeof flavor.htreviewsId).toBe('number');
      expect(typeof flavor.addedBy).toBe('string');
    }, 60000);
  });
  
  // ============================================================================
  // Error Handling Integration Tests
  // ============================================================================
  
  describe('Error Handling', () => {
    
    it('should handle 404 errors for non-existent brands', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const brand = await scrapeBrandDetails('non-existent-brand-xyz-123');
      
      // Should return null for 404
      expect(brand).toBeNull();
    }, 60000);
    
    it('should handle 404 errors for non-existent flavors', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const flavor = await scrapeFlavorDetails('non-existent/brand/flavor');
      
      // Should return null for 404
      expect(flavor).toBeNull();
    }, 60000);
    
    it('should handle network timeouts gracefully', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      // This test documents expected behavior
      // In real scenarios, network timeouts should be handled by retry logic
      
      const brands = await scrapeBrandsList();
      
      // Should either return data or empty array, never throw
      expect(Array.isArray(brands)).toBe(true);
    }, 60000);
  });
  
  // ============================================================================
  // Performance Tests
  // ============================================================================
  
  describe('Performance', () => {
    
    it('should scrape brands list within reasonable time', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const startTime = Date.now();
      const brands = await scrapeBrandsList();
      const duration = Date.now() - startTime;
      
      console.log(`\n  ⏱️  Brands list scrape time: ${duration}ms`);
      
      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
      expect(brands.length).toBeGreaterThan(0);
    }, 60000);
    
    it('should scrape brand details within reasonable time', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const startTime = Date.now();
      const brand = await scrapeBrandDetails(TEST_BRAND_SLUG);
      const duration = Date.now() - startTime;
      
      console.log(`\n  ⏱️  Brand details scrape time: ${duration}ms`);
      
      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
      expect(brand).toBeDefined();
    }, 60000);
    
    it('should scrape flavor details within reasonable time', async () => {
      if (!shouldRunIntegrationTests) {
        return;
      }
      
      const startTime = Date.now();
      const flavor = await scrapeFlavorDetails(TEST_FLAVOR_SLUG);
      const duration = Date.now() - startTime;
      
      console.log(`\n  ⏱️  Flavor details scrape time: ${duration}ms`);
      
      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
      expect(flavor).toBeDefined();
    }, 60000);
  });
});
