#!/usr/bin/env ts-node
/**
 * Test Scraper with Real Data from htreviews.org
 * 
 * This script validates the scraper module by:
 * 1. Scraping brand list from htreviews.org
 * 2. Scraping detailed information for selected brands
 * 3. Scraping flavor details for selected flavors
 * 4. Validating data against TypeScript interfaces
 * 5. Reporting any issues found
 */

import { scrapeBrandsList } from '../packages/scraper/src/brand-scraper';
import { scrapeBrandDetails } from '../packages/scraper/src/brand-details-scraper';
import { scrapeFlavorDetails } from '../packages/scraper/src/flavor-details-scraper';
import { Brand, Flavor } from '../packages/types/src';
import { LoggerFactory } from '../packages/utils/src/logger-factory';

// Initialize logger
const logger = LoggerFactory.createEnvironmentLogger('test-scraper');

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CONFIG = {
  maxBrandsToTest: 2,
  maxFlavorsPerBrand: 2,
  targetBrandSlugs: ['sarma'], // Try to scrape these specific brands if available
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate Brand object against TypeScript interface
 */
function validateBrand(brand: Brand, index: number): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check required fields
  if (typeof brand.slug !== 'string' || !brand.slug) {
    issues.push(`Brand ${index}: Missing or invalid slug`);
  }
  if (typeof brand.name !== 'string' || !brand.name) {
    issues.push(`Brand ${index}: Missing or invalid name`);
  }
  if (typeof brand.nameEn !== 'string' || !brand.nameEn) {
    issues.push(`Brand ${index}: Missing or invalid nameEn`);
  }
  if (typeof brand.description !== 'string') {
    issues.push(`Brand ${index}: Missing or invalid description`);
  }
  if (typeof brand.country !== 'string') {
    issues.push(`Brand ${index}: Missing or invalid country`);
  }
  if (typeof brand.status !== 'string') {
    issues.push(`Brand ${index}: Missing or invalid status`);
  }

  // Check optional fields
  if (brand.website !== null && typeof brand.website !== 'string') {
    issues.push(`Brand ${index}: Invalid website type`);
  }
  if (brand.foundedYear !== null && typeof brand.foundedYear !== 'number') {
    issues.push(`Brand ${index}: Invalid foundedYear type`);
  }
  if (brand.imageUrl !== null && typeof brand.imageUrl !== 'string') {
    issues.push(`Brand ${index}: Invalid imageUrl type`);
  }

  // Check numeric fields
  if (typeof brand.rating !== 'number' || brand.rating < 0 || brand.rating > 5) {
    issues.push(`Brand ${index}: Invalid rating (${brand.rating})`);
  }
  if (typeof brand.ratingsCount !== 'number' || brand.ratingsCount < 0) {
    issues.push(`Brand ${index}: Invalid ratingsCount (${brand.ratingsCount})`);
  }
  if (typeof brand.reviewsCount !== 'number' || brand.reviewsCount < 0) {
    issues.push(`Brand ${index}: Invalid reviewsCount (${brand.reviewsCount})`);
  }
  if (typeof brand.viewsCount !== 'number' || brand.viewsCount < 0) {
    issues.push(`Brand ${index}: Invalid viewsCount (${brand.viewsCount})`);
  }

  // Check array fields
  if (!Array.isArray(brand.lines)) {
    issues.push(`Brand ${index}: Invalid lines (not an array)`);
  }
  if (!Array.isArray(brand.flavors)) {
    issues.push(`Brand ${index}: Invalid flavors (not an array)`);
  }

  // Validate lines
  brand.lines.forEach((line, lineIndex) => {
    if (typeof line.slug !== 'string' || !line.slug) {
      issues.push(`Brand ${index} Line ${lineIndex}: Missing or invalid slug`);
    }
    if (typeof line.name !== 'string' || !line.name) {
      issues.push(`Brand ${index} Line ${lineIndex}: Missing or invalid name`);
    }
    if (typeof line.brandSlug !== 'string' || !line.brandSlug) {
      issues.push(`Brand ${index} Line ${lineIndex}: Missing or invalid brandSlug`);
    }
    if (typeof line.rating !== 'number' || line.rating < 0 || line.rating > 5) {
      issues.push(`Brand ${index} Line ${lineIndex}: Invalid rating (${line.rating})`);
    }
    if (typeof line.flavorsCount !== 'number' || line.flavorsCount < 0) {
      issues.push(`Brand ${index} Line ${lineIndex}: Invalid flavorsCount (${line.flavorsCount})`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validate Flavor object against TypeScript interface
 */
function validateFlavor(flavor: Flavor, index: number): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check required fields
  if (typeof flavor.slug !== 'string' || !flavor.slug) {
    issues.push(`Flavor ${index}: Missing or invalid slug`);
  }
  if (typeof flavor.name !== 'string' || !flavor.name) {
    issues.push(`Flavor ${index}: Missing or invalid name`);
  }
  if (typeof flavor.description !== 'string') {
    issues.push(`Flavor ${index}: Missing or invalid description`);
  }
  if (typeof flavor.brandSlug !== 'string' || !flavor.brandSlug) {
    issues.push(`Flavor ${index}: Missing or invalid brandSlug`);
  }
  if (typeof flavor.brandName !== 'string' || !flavor.brandName) {
    issues.push(`Flavor ${index}: Missing or invalid brandName`);
  }
  if (typeof flavor.country !== 'string') {
    issues.push(`Flavor ${index}: Missing or invalid country`);
  }
  if (typeof flavor.status !== 'string') {
    issues.push(`Flavor ${index}: Missing or invalid status`);
  }
  if (typeof flavor.addedBy !== 'string') {
    issues.push(`Flavor ${index}: Missing or invalid addedBy`);
  }

  // Check optional fields
  if (flavor.nameAlt !== null && typeof flavor.nameAlt !== 'string') {
    issues.push(`Flavor ${index}: Invalid nameAlt type`);
  }
  if (flavor.lineSlug !== null && typeof flavor.lineSlug !== 'string') {
    issues.push(`Flavor ${index}: Invalid lineSlug type`);
  }
  if (flavor.lineName !== null && typeof flavor.lineName !== 'string') {
    issues.push(`Flavor ${index}: Invalid lineName type`);
  }
  if (flavor.officialStrength !== null && typeof flavor.officialStrength !== 'string') {
    issues.push(`Flavor ${index}: Invalid officialStrength type`);
  }
  if (flavor.userStrength !== null && typeof flavor.userStrength !== 'string') {
    issues.push(`Flavor ${index}: Invalid userStrength type`);
  }
  if (flavor.imageUrl !== null && typeof flavor.imageUrl !== 'string') {
    issues.push(`Flavor ${index}: Invalid imageUrl type`);
  }

  // Check array fields
  if (!Array.isArray(flavor.tags)) {
    issues.push(`Flavor ${index}: Invalid tags (not an array)`);
  } else {
    flavor.tags.forEach((tag, tagIndex) => {
      if (typeof tag !== 'string') {
        issues.push(`Flavor ${index}: Invalid tag at index ${tagIndex}`);
      }
    });
  }

  // Check numeric fields
  if (typeof flavor.rating !== 'number' || flavor.rating < 0 || flavor.rating > 5) {
    issues.push(`Flavor ${index}: Invalid rating (${flavor.rating})`);
  }
  if (typeof flavor.ratingsCount !== 'number' || flavor.ratingsCount < 0) {
    issues.push(`Flavor ${index}: Invalid ratingsCount (${flavor.ratingsCount})`);
  }
  if (typeof flavor.reviewsCount !== 'number' || flavor.reviewsCount < 0) {
    issues.push(`Flavor ${index}: Invalid reviewsCount (${flavor.reviewsCount})`);
  }
  if (typeof flavor.viewsCount !== 'number' || flavor.viewsCount < 0) {
    issues.push(`Flavor ${index}: Invalid viewsCount (${flavor.viewsCount})`);
  }
  if (typeof flavor.smokeAgainPercentage !== 'number' || flavor.smokeAgainPercentage < 0 || flavor.smokeAgainPercentage > 100) {
    issues.push(`Flavor ${index}: Invalid smokeAgainPercentage (${flavor.smokeAgainPercentage})`);
  }
  if (typeof flavor.htreviewsId !== 'number' || flavor.htreviewsId <= 0) {
    issues.push(`Flavor ${index}: Invalid htreviewsId (${flavor.htreviewsId})`);
  }

  // Check rating distribution
  if (!flavor.ratingDistribution || typeof flavor.ratingDistribution !== 'object') {
    issues.push(`Flavor ${index}: Missing or invalid ratingDistribution`);
  } else {
    const rd = flavor.ratingDistribution;
    if (typeof rd.count5 !== 'number' || rd.count5 < 0) {
      issues.push(`Flavor ${index}: Invalid ratingDistribution.count5 (${rd.count5})`);
    }
    if (typeof rd.count4 !== 'number' || rd.count4 < 0) {
      issues.push(`Flavor ${index}: Invalid ratingDistribution.count4 (${rd.count4})`);
    }
    if (typeof rd.count3 !== 'number' || rd.count3 < 0) {
      issues.push(`Flavor ${index}: Invalid ratingDistribution.count3 (${rd.count3})`);
    }
    if (typeof rd.count2 !== 'number' || rd.count2 < 0) {
      issues.push(`Flavor ${index}: Invalid ratingDistribution.count2 (${rd.count2})`);
    }
    if (typeof rd.count1 !== 'number' || rd.count1 < 0) {
      issues.push(`Flavor ${index}: Invalid ratingDistribution.count1 (${rd.count1})`);
    }
  }

  // Check date
  if (!(flavor.dateAdded instanceof Date) || isNaN(flavor.dateAdded.getTime())) {
    issues.push(`Flavor ${index}: Invalid dateAdded (${flavor.dateAdded})`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// ============================================================================
// Test Functions
// ============================================================================

/**
 * Test brand list scraping
 */
async function testBrandListScraping(): Promise<{ success: boolean; brands: any[]; errors: string[] }> {
  logger.info('=== Testing Brand List Scraping ===');
  const errors: string[] = [];

  try {
    logger.info('Fetching brand list from htreviews.org...');
    const brands = await scrapeBrandsList();

    if (!Array.isArray(brands)) {
      errors.push('Brand list is not an array');
      return { success: false, brands: [], errors };
    }

    if (brands.length === 0) {
      errors.push('No brands found');
      return { success: false, brands: [], errors };
    }

    logger.info(`Successfully scraped ${brands.length} brands`);

    // Log first few brands for verification
    logger.info('Sample brands:');
    brands.slice(0, 5).forEach((brand, index) => {
      logger.info(`  ${index + 1}. ${brand.name} (${brand.slug}) - Rating: ${brand.rating}`);
    });

    return { success: true, brands, errors };
  } catch (error) {
    const errorMsg = `Failed to scrape brand list: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    errors.push(errorMsg);
    return { success: false, brands: [], errors };
  }
}

/**
 * Test brand details scraping
 */
async function testBrandDetailsScraping(brandSlug: string): Promise<{ success: boolean; brand: Brand | null; errors: string[] }> {
  logger.info(`\n=== Testing Brand Details Scraping for ${brandSlug} ===`);
  const errors: string[] = [];

  try {
    logger.info(`Fetching brand details for ${brandSlug}...`);
    const brand = await scrapeBrandDetails(brandSlug);

    if (!brand) {
      errors.push(`Failed to scrape brand details for ${brandSlug}`);
      return { success: false, brand: null, errors };
    }

    logger.info(`Successfully scraped brand: ${brand.name}`);
    logger.info(`  - Slug: ${brand.slug}`);
    logger.info(`  - Country: ${brand.country}`);
    logger.info(`  - Rating: ${brand.rating} (${brand.ratingsCount} ratings)`);
    logger.info(`  - Lines: ${brand.lines.length}`);

    // Validate against TypeScript interface
    const validation = validateBrand(brand, 0);
    if (!validation.valid) {
      errors.push(...validation.issues);
      logger.warn('Validation issues found:', validation.issues as any);
    } else {
      logger.info('✓ Brand data validation passed');
    }

    return { success: validation.valid, brand, errors };
  } catch (error) {
    const errorMsg = `Failed to scrape brand details for ${brandSlug}: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    errors.push(errorMsg);
    return { success: false, brand: null, errors };
  }
}

/**
 * Test flavor details scraping
 */
async function testFlavorDetailsScraping(flavorSlug: string): Promise<{ success: boolean; flavor: Flavor | null; errors: string[] }> {
  logger.info(`\n=== Testing Flavor Details Scraping for ${flavorSlug} ===`);
  const errors: string[] = [];

  try {
    logger.info(`Fetching flavor details for ${flavorSlug}...`);
    const flavor = await scrapeFlavorDetails(flavorSlug);

    if (!flavor) {
      errors.push(`Failed to scrape flavor details for ${flavorSlug}`);
      return { success: false, flavor: null, errors };
    }

    logger.info(`Successfully scraped flavor: ${flavor.name}`);
    logger.info(`  - Slug: ${flavor.slug}`);
    logger.info(`  - Brand: ${flavor.brandName}`);
    logger.info(`  - Line: ${flavor.lineName || 'N/A'}`);
    logger.info(`  - Rating: ${flavor.rating} (${flavor.ratingsCount} ratings)`);
    logger.info(`  - Tags: ${flavor.tags.join(', ')}`);

    // Validate against TypeScript interface
    const validation = validateFlavor(flavor, 0);
    if (!validation.valid) {
      errors.push(...validation.issues);
      logger.warn('Validation issues found:', validation.issues as any);
    } else {
      logger.info('✓ Flavor data validation passed');
    }

    return { success: validation.valid, flavor, errors };
  } catch (error) {
    const errorMsg = `Failed to scrape flavor details for ${flavorSlug}: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    errors.push(errorMsg);
    return { success: false, flavor: null, errors };
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main(): Promise<void> {
  logger.info('╔══════════════════════════════════════════════════════════════════╗');
  logger.info('║  Scraper Real Data Test                                          ║');
  logger.info('║  Testing scraper with live data from htreviews.org                 ║');
  logger.info('╚══════════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();
  const allErrors: string[] = [];

  // Test 1: Scrape brand list
  const brandListResult = await testBrandListScraping();
  allErrors.push(...brandListResult.errors);

  if (!brandListResult.success) {
    logger.error('❌ Brand list scraping failed. Aborting further tests.');
    printSummary(0, 0, 0, allErrors, Date.now() - startTime);
    process.exit(1);
  }

  // Select brands to test
  const brandsToTest: string[] = [];
  const availableBrands = brandListResult.brands;

  // Try to find target brands
  for (const targetSlug of TEST_CONFIG.targetBrandSlugs) {
    const found = availableBrands.find((b: any) => b.slug === targetSlug);
    if (found) {
      brandsToTest.push(found.slug);
      logger.info(`✓ Found target brand: ${found.name} (${found.slug})`);
    }
  }

  // Add more brands if needed
  for (const brand of availableBrands) {
    if (brandsToTest.length >= TEST_CONFIG.maxBrandsToTest) break;
    if (!brandsToTest.includes(brand.slug)) {
      brandsToTest.push(brand.slug);
      logger.info(`✓ Selected brand: ${brand.name} (${brand.slug})`);
    }
  }

  // Test 2: Scrape brand details
  let successfulBrandDetails = 0;
  let successfulFlavors = 0;

  for (const brandSlug of brandsToTest) {
    const result = await testBrandDetailsScraping(brandSlug);
    allErrors.push(...result.errors);

    if (result.success && result.brand) {
      successfulBrandDetails++;

      // Test 3: Scrape flavor details for this brand
      // For Sarma, we know: sarma/klassicheskaya/zima
      if (brandSlug === 'sarma') {
        const exampleFlavors = [
          'sarma/klassicheskaya/zima',
          'sarma/klassicheskaya/letniy_den',
        ];

        for (const flavorSlug of exampleFlavors.slice(0, TEST_CONFIG.maxFlavorsPerBrand)) {
          const flavorResult = await testFlavorDetailsScraping(flavorSlug);
          allErrors.push(...flavorResult.errors);
          if (flavorResult.success) {
            successfulFlavors++;
          }
        }
      }
    }

    // Add delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  printSummary(successfulBrandDetails, successfulFlavors, brandsToTest.length, allErrors, Date.now() - startTime);

  // Exit with appropriate code
  if (allErrors.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

/**
 * Print test summary
 */
function printSummary(
  successfulBrandDetails: number,
  successfulFlavors: number,
  totalBrandsTested: number,
  errors: string[],
  duration: number
): void {
  logger.info('\n╔══════════════════════════════════════════════════════════════════╗');
  logger.info('║  Test Summary                                                       ║');
  logger.info('╚══════════════════════════════════════════════════════════════════╝');
  logger.info('');
  logger.info(`✓ Brand list scraped successfully`);
  logger.info(`✓ ${successfulBrandDetails}/${totalBrandsTested} brand details scraped successfully`);
  logger.info(`✓ ${successfulFlavors} flavor details scraped successfully`);
  logger.info(`⏱️  Total duration: ${(duration / 1000).toFixed(2)}s`);
  logger.info('');

  if (errors.length > 0) {
    logger.error(`❌ ${errors.length} error(s) encountered:`);
    errors.forEach((error, index) => {
      logger.error(`  ${index + 1}. ${error}`);
    });
    logger.error('');
  } else {
    logger.info('✅ All tests passed successfully!');
    logger.info('');
  }
}

// Run tests
main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
