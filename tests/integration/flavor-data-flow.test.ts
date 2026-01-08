/**
 * Flavor Data Flow Integration Tests
 *
 * These tests verify the complete end-to-end flavor data flow:
 * 1. Scraping brand from htreviews.org
 * 2. Extracting flavor URLs from brand page
 * 3. Scraping flavor details for each flavor
 * 4. Storing flavor data in SQLite database
 * 5. Verifying database state and data integrity
 *
 * Tests are disabled by default to respect htreviews.org's server resources.
 * Set INTEGRATION_TESTS=true to run these tests.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { SQLiteDatabase } from '../../src/database';
import { DataService } from '../../src/services';
import { scrapeBrandDetails, scrapeFlavorDetails } from '../../src/scraper';
import { Brand, Flavor } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const TEST_DB_PATH = './test-flavor-flow.db';
const TEST_BRAND_SLUG = 'sarma'; // Sarma brand has ~94 flavors
const EXPECTED_FLAVOR_COUNT = 94; // Approximate count for Sarma brand

// Check if integration tests are enabled
const integrationTestsEnabled = process.env.INTEGRATION_TESTS === 'true';

describe('Flavor Data Flow Integration Tests', () => {
  let db: SQLiteDatabase;
  let dataService: DataService;

  beforeAll(async () => {
    if (!integrationTestsEnabled) {
      console.log('⚠️ Integration tests are skipped. Set INTEGRATION_TESTS=true to run them.');
      return;
    }

    console.log('\n=== Flavor Data Flow Integration Tests ===');
    console.log(`Test Database: ${TEST_DB_PATH}`);
    console.log(`Test Brand: ${TEST_BRAND_SLUG}`);
    console.log(`Expected Flavor Count: ~${EXPECTED_FLAVOR_COUNT}`);
    console.log('========================================\n');

    // Clean up test database if it exists
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Initialize test database
    db = new SQLiteDatabase(TEST_DB_PATH);
    dataService = new DataService(db);
  });

  afterAll(async () => {
    if (!integrationTestsEnabled) {
      return;
    }

    // Close database connection
    db.close();

    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
      console.log('\n✅ Test database cleaned up');
    }
  });

  beforeEach(() => {
    if (!integrationTestsEnabled) {
      return;
    }

    // Clear database before each test
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    db = new SQLiteDatabase(TEST_DB_PATH);
    dataService = new DataService(db);
  });

  describe('Step 1: Brand Scraping', () => {
    it('should scrape brand details from htreviews.org', async () => {
      if (!integrationTestsEnabled) {
        return;
      }

      console.log('\n--- Step 1: Scraping Brand Details ---');
      console.log(`Fetching brand: ${TEST_BRAND_SLUG}`);

      const startTime = Date.now();
      const brand = await scrapeBrandDetails(TEST_BRAND_SLUG);
      const duration = Date.now() - startTime;

      console.log(`✓ Brand scraped in ${duration}ms`);

      // Verify brand data
      expect(brand).not.toBeNull();
      expect(brand!.slug).toBe(TEST_BRAND_SLUG);
      expect(brand!.name).toBeDefined();
      expect(brand!.nameEn).toBeDefined();
      expect(brand!.country).toBeDefined();
      expect(brand!.rating).toBeGreaterThanOrEqual(0);
      expect(brand!.rating).toBeLessThanOrEqual(5);
      expect(brand!.ratingsCount).toBeGreaterThanOrEqual(0);
      expect(brand!.reviewsCount).toBeGreaterThanOrEqual(0);
      expect(brand!.viewsCount).toBeGreaterThanOrEqual(0);

      console.log(`  Brand Name: ${brand!.name} (${brand!.nameEn})`);
      console.log(`  Country: ${brand!.country}`);
      console.log(`  Rating: ${brand!.rating} (${brand!.ratingsCount} ratings)`);
      console.log(`  Lines: ${brand!.lines.length}`);
      console.log('✓ Brand data validated');
    });

    it('should save brand to database', async () => {
      if (!integrationTestsEnabled) {
        return;
      }

      console.log('\n--- Step 1: Saving Brand to Database ---');

      // Scrape brand
      const brand = await scrapeBrandDetails(TEST_BRAND_SLUG);
      expect(brand).not.toBeNull();

      // Save to database
      db.setBrand(brand!);

      // Verify brand is saved
      const savedBrand = db.getBrand(TEST_BRAND_SLUG);
      expect(savedBrand).not.toBeNull();
      expect(savedBrand!.slug).toBe(TEST_BRAND_SLUG);
      expect(savedBrand!.name).toBe(brand!.name);
      expect(savedBrand!.nameEn).toBe(brand!.nameEn);

      console.log(`✓ Brand saved to database: ${TEST_BRAND_SLUG}`);

      // Verify database stats
      const stats = db.getStats();
      expect(stats.brandsCount).toBe(1);
      expect(stats.flavorsCount).toBe(0);

      console.log(`✓ Database stats: ${stats.brandsCount} brand(s), ${stats.flavorsCount} flavor(s)`);
    });
  });

  describe('Step 2: Flavor URL Extraction', () => {
    it('should extract flavor URLs from brand page', async () => {
      if (!integrationTestsEnabled) {
        return;
      }

      console.log('\n--- Step 2: Extracting Flavor URLs ---');

      // Import Scraper to fetch page
      const { Scraper } = await import('../../src/scraper');
      const scraper = new Scraper();

      // Fetch brand page HTML
      const $ = await scraper.fetchAndParse(`/tobaccos/${TEST_BRAND_SLUG}`);

      // Extract flavor URLs
      const flavorUrls: string[] = [];
      const flavorItems = $('.tobacco_list_item');

      console.log(`Found ${flavorItems.length} flavor items on brand page`);

      for (let i = 0; i < flavorItems.length; i++) {
        const item = flavorItems.eq(i);
        const slugElement = item.find('.tobacco_list_item_slug');

        if (slugElement.length > 0) {
          const href = slugElement.attr('href');
          if (href && href.trim() !== '') {
            flavorUrls.push(href.trim());
          }
        }
      }

      console.log(`✓ Extracted ${flavorUrls.length} flavor URLs`);

      // Verify we found flavors
      expect(flavorUrls.length).toBeGreaterThan(0);
      expect(flavorUrls.length).toBeGreaterThanOrEqual(EXPECTED_FLAVOR_COUNT * 0.8); // Allow 20% variance

      // Verify URL format
      flavorUrls.forEach(url => {
        expect(url).toBeDefined();
        expect(url.length).toBeGreaterThan(0);
        expect(url).toMatch(/^(\/tobaccos\/|https:\/\/htreviews\.org\/tobaccos\/)/);
      });

      console.log(`✓ Flavor URL format validated`);
      console.log(`  Sample URLs: ${flavorUrls.slice(0, 3).join(', ')}...`);
    });
  });

  describe('Step 3: Flavor Details Scraping', () => {
    it('should scrape flavor details for first 5 flavors', async () => {
      if (!integrationTestsEnabled) {
        return;
      }

      console.log('\n--- Step 3: Scraping Flavor Details (Sample) ---');

      // Import Scraper to fetch page
      const { Scraper } = await import('../../src/scraper');
      const scraper = new Scraper();

      // Fetch brand page HTML
      const $ = await scraper.fetchAndParse(`/tobaccos/${TEST_BRAND_SLUG}`);

      // Extract flavor URLs
      const flavorUrls: string[] = [];
      const flavorItems = $('.tobacco_list_item');

      for (let i = 0; i < flavorItems.length; i++) {
        const item = flavorItems.eq(i);
        const slugElement = item.find('.tobacco_list_item_slug');

        if (slugElement.length > 0) {
          const href = slugElement.attr('href');
          if (href && href.trim() !== '') {
            flavorUrls.push(href.trim());
          }
        }
      }

      // Test first 5 flavors
      const testCount = Math.min(5, flavorUrls.length);
      console.log(`Testing ${testCount} flavors out of ${flavorUrls.length} total`);

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < testCount; i++) {
        const flavorUrl = flavorUrls[i];

        try {
          // Extract flavor slug
          let flavorSlug: string;
          if (flavorUrl.startsWith('http')) {
            const urlParts = new URL(flavorUrl);
            const pathParts = urlParts.pathname.split('/').filter(part => part.length > 0);
            const tobaccosIndex = pathParts.indexOf('tobaccos');
            if (tobaccosIndex >= 0 && tobaccosIndex < pathParts.length - 1) {
              flavorSlug = pathParts.slice(tobaccosIndex + 1).join('/');
            } else {
              failCount++;
              continue;
            }
          } else if (flavorUrl.startsWith('/tobaccos/')) {
            flavorSlug = flavorUrl.replace(/^\/tobaccos\//, '');
          } else {
            flavorSlug = flavorUrl;
          }

          console.log(`  Scraping flavor ${i + 1}/${testCount}: ${flavorSlug}`);

          // Scrape flavor details
          const flavor = await scrapeFlavorDetails(flavorSlug);

          if (!flavor) {
            console.log(`    ✗ Failed: flavor details returned null`);
            failCount++;
            continue;
          }

          // Verify flavor data
          expect(flavor.slug).toBeDefined();
          expect(flavor.name).toBeDefined();
          expect(flavor.brandSlug).toBe(TEST_BRAND_SLUG);
          expect(flavor.rating).toBeGreaterThanOrEqual(0);
          expect(flavor.rating).toBeLessThanOrEqual(5);
          expect(flavor.ratingsCount).toBeGreaterThanOrEqual(0);
          expect(flavor.reviewsCount).toBeGreaterThanOrEqual(0);
          expect(flavor.viewsCount).toBeGreaterThanOrEqual(0);
          expect(flavor.htreviewsId).toBeDefined();
          expect(flavor.dateAdded).toBeDefined();

          console.log(`    ✓ Success: ${flavor.name} (Rating: ${flavor.rating})`);
          successCount++;

          // Add delay between requests
          if (i < testCount - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`    ✗ Failed: ${errorMessage}`);
          failCount++;
        }
      }

      console.log(`✓ Flavor scraping completed: ${successCount} success, ${failCount} failed`);

      // Verify at least 80% success rate
      const successRate = successCount / testCount;
      expect(successRate).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('Step 4: Database Storage', () => {
    it('should save multiple flavors to database', async () => {
      if (!integrationTestsEnabled) {
        return;
      }

      console.log('\n--- Step 4: Saving Flavors to Database ---');

      // Import Scraper to fetch page
      const { Scraper } = await import('../../src/scraper');
      const scraper = new Scraper();

      // Fetch brand page HTML
      const $ = await scraper.fetchAndParse(`/tobaccos/${TEST_BRAND_SLUG}`);

      // Extract flavor URLs
      const flavorUrls: string[] = [];
      const flavorItems = $('.tobacco_list_item');

      for (let i = 0; i < flavorItems.length; i++) {
        const item = flavorItems.eq(i);
        const slugElement = item.find('.tobacco_list_item_slug');

        if (slugElement.length > 0) {
          const href = slugElement.attr('href');
          if (href && href.trim() !== '') {
            flavorUrls.push(href.trim());
          }
        }
      }

      // Save first 10 flavors to database
      const saveCount = Math.min(10, flavorUrls.length);
      console.log(`Saving ${saveCount} flavors to database`);

      let savedCount = 0;

      for (let i = 0; i < saveCount; i++) {
        const flavorUrl = flavorUrls[i];

        try {
          // Extract flavor slug
          let flavorSlug: string;
          if (flavorUrl.startsWith('http')) {
            const urlParts = new URL(flavorUrl);
            const pathParts = urlParts.pathname.split('/').filter(part => part.length > 0);
            const tobaccosIndex = pathParts.indexOf('tobaccos');
            if (tobaccosIndex >= 0 && tobaccosIndex < pathParts.length - 1) {
              flavorSlug = pathParts.slice(tobaccosIndex + 1).join('/');
            } else {
              continue;
            }
          } else if (flavorUrl.startsWith('/tobaccos/')) {
            flavorSlug = flavorUrl.replace(/^\/tobaccos\//, '');
          } else {
            flavorSlug = flavorUrl;
          }

          // Scrape flavor details
          const flavor = await scrapeFlavorDetails(flavorSlug);

          if (!flavor) {
            continue;
          }

          // Save to database
          db.setFlavor(flavor);
          savedCount++;

          console.log(`  ✓ Saved: ${flavor.name} (${flavor.slug})`);

          // Add delay between requests
          if (i < saveCount - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`  ✗ Failed to save: ${errorMessage}`);
        }
      }

      console.log(`✓ Saved ${savedCount} flavors to database`);

      // Verify database state
      const stats = db.getStats();
      expect(stats.flavorsCount).toBe(savedCount);

      console.log(`✓ Database stats: ${stats.brandsCount} brand(s), ${stats.flavorsCount} flavor(s)`);
    });

    it('should retrieve flavors from database', async () => {
      if (!integrationTestsEnabled) {
        return;
      }

      console.log('\n--- Step 4: Retrieving Flavors from Database ---');

      // Save a test flavor
      const testFlavor: Flavor = {
        slug: 'test-brand/test-line/test-flavor',
        name: 'Test Flavor',
        nameAlt: null,
        description: 'Test description',
        brandSlug: 'test-brand',
        brandName: 'Test Brand',
        lineSlug: 'test-line',
        lineName: 'Test Line',
        country: 'Россия',
        officialStrength: 'Средняя',
        userStrength: 'Средняя',
        status: 'Выпускается',
        imageUrl: null,
        tags: ['Холодок', 'Сладкий'],
        rating: 4.5,
        ratingsCount: 100,
        reviewsCount: 50,
        viewsCount: 1000,
        ratingDistribution: {
          count1: 5,
          count2: 10,
          count3: 20,
          count4: 40,
          count5: 25,
        },
        smokeAgainPercentage: 85,
        htreviewsId: 12345,
        dateAdded: new Date('2024-01-01'),
        addedBy: 'testuser',
      };

      db.setFlavor(testFlavor);

      // Retrieve flavor
      const retrievedFlavor = db.getFlavor('test-brand/test-line/test-flavor');

      expect(retrievedFlavor).not.toBeNull();
      expect(retrievedFlavor!.slug).toBe(testFlavor.slug);
      expect(retrievedFlavor!.name).toBe(testFlavor.name);
      expect(retrievedFlavor!.brandSlug).toBe(testFlavor.brandSlug);
      expect(retrievedFlavor!.rating).toBe(testFlavor.rating);
      expect(retrievedFlavor!.tags).toEqual(testFlavor.tags);

      console.log(`✓ Flavor retrieved from database: ${testFlavor.name}`);

      // Get all flavors
      const allFlavors = db.getAllFlavors();
      expect(allFlavors.length).toBe(1);
      expect(allFlavors[0].slug).toBe(testFlavor.slug);

      console.log(`✓ All flavors retrieved: ${allFlavors.length} flavor(s)`);

      // Get flavors by brand
      const brandFlavors = db.getFlavorsByBrand('test-brand');
      expect(brandFlavors.length).toBe(1);
      expect(brandFlavors[0].slug).toBe(testFlavor.slug);

      console.log(`✓ Brand flavors retrieved: ${brandFlavors.length} flavor(s) for test-brand`);
    });
  });

  describe('Step 5: Complete Data Flow', () => {
    it('should complete full data flow for one brand', async () => {
      if (!integrationTestsEnabled) {
        return;
      }

      console.log('\n--- Step 5: Complete Data Flow Test ---');
      console.log('Testing complete flow: Scrape → Extract → Scrape → Store → Verify');

      const startTime = Date.now();

      // Step 1: Scrape brand details
      console.log('\n[1/5] Scraping brand details...');
      const brand = await scrapeBrandDetails(TEST_BRAND_SLUG);
      expect(brand).not.toBeNull();
      console.log(`  ✓ Brand scraped: ${brand!.name}`);

      // Step 2: Save brand to database
      console.log('\n[2/5] Saving brand to database...');
      db.setBrand(brand!);
      const savedBrand = db.getBrand(TEST_BRAND_SLUG);
      expect(savedBrand).not.toBeNull();
      console.log(`  ✓ Brand saved: ${savedBrand!.name}`);

      // Step 3: Extract flavor URLs
      console.log('\n[3/5] Extracting flavor URLs...');
      const { Scraper } = await import('../../src/scraper');
      const scraper = new Scraper();
      const $ = await scraper.fetchAndParse(`/tobaccos/${TEST_BRAND_SLUG}`);

      const flavorUrls: string[] = [];
      const flavorItems = $('.tobacco_list_item');

      for (let i = 0; i < flavorItems.length; i++) {
        const item = flavorItems.eq(i);
        const slugElement = item.find('.tobacco_list_item_slug');

        if (slugElement.length > 0) {
          const href = slugElement.attr('href');
          if (href && href.trim() !== '') {
            flavorUrls.push(href.trim());
          }
        }
      }

      console.log(`  ✓ Extracted ${flavorUrls.length} flavor URLs`);

      // Step 4: Scrape and save first 5 flavors
      console.log('\n[4/5] Scraping and saving flavors (first 5)...');
      const testCount = Math.min(5, flavorUrls.length);
      let savedCount = 0;

      for (let i = 0; i < testCount; i++) {
        const flavorUrl = flavorUrls[i];

        try {
          // Extract flavor slug
          let flavorSlug: string;
          if (flavorUrl.startsWith('http')) {
            const urlParts = new URL(flavorUrl);
            const pathParts = urlParts.pathname.split('/').filter(part => part.length > 0);
            const tobaccosIndex = pathParts.indexOf('tobaccos');
            if (tobaccosIndex >= 0 && tobaccosIndex < pathParts.length - 1) {
              flavorSlug = pathParts.slice(tobaccosIndex + 1).join('/');
            } else {
              continue;
            }
          } else if (flavorUrl.startsWith('/tobaccos/')) {
            flavorSlug = flavorUrl.replace(/^\/tobaccos\//, '');
          } else {
            flavorSlug = flavorUrl;
          }

          // Scrape flavor details
          const flavor = await scrapeFlavorDetails(flavorSlug);

          if (!flavor) {
            continue;
          }

          // Save to database
          db.setFlavor(flavor);
          savedCount++;

          console.log(`  ✓ Saved: ${flavor.name} (Rating: ${flavor.rating})`);

          // Add delay between requests
          if (i < testCount - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`  ✗ Failed: ${errorMessage}`);
        }
      }

      console.log(`  ✓ Saved ${savedCount} flavors to database`);

      // Step 5: Verify database state
      console.log('\n[5/5] Verifying database state...');
      const stats = db.getStats();

      expect(stats.brandsCount).toBe(1);
      expect(stats.flavorsCount).toBe(savedCount);

      console.log(`  ✓ Database stats: ${stats.brandsCount} brand(s), ${stats.flavorsCount} flavor(s)`);

      // Verify brand data
      const verifiedBrand = db.getBrand(TEST_BRAND_SLUG);
      expect(verifiedBrand).not.toBeNull();
      expect(verifiedBrand!.slug).toBe(TEST_BRAND_SLUG);
      expect(verifiedBrand!.name).toBe(brand!.name);

      console.log(`  ✓ Brand data verified: ${verifiedBrand!.name}`);

      // Verify flavor data
      const allFlavors = db.getAllFlavors();
      expect(allFlavors.length).toBe(savedCount);

      // Verify each flavor has required fields
      allFlavors.forEach(flavor => {
        expect(flavor.slug).toBeDefined();
        expect(flavor.name).toBeDefined();
        expect(flavor.brandSlug).toBe(TEST_BRAND_SLUG);
        expect(flavor.rating).toBeGreaterThanOrEqual(0);
        expect(flavor.rating).toBeLessThanOrEqual(5);
        expect(flavor.htreviewsId).toBeDefined();
        expect(flavor.dateAdded).toBeDefined();
      });

      console.log(`  ✓ Flavor data verified: ${allFlavors.length} flavor(s) with all required fields`);

      const duration = Date.now() - startTime;
      console.log(`\n✅ Complete data flow test passed in ${duration}ms`);
      console.log(`   Summary: ${stats.brandsCount} brand(s), ${stats.flavorsCount} flavor(s)`);
    });
  });

  describe('Data Integrity Verification', () => {
    it('should verify data integrity for all required fields', async () => {
      if (!integrationTestsEnabled) {
        return;
      }

      console.log('\n--- Data Integrity Verification ---');

      // Save test brand
      const testBrand: Brand = {
        slug: 'test-brand',
        name: 'Test Brand',
        nameEn: 'Test Brand EN',
        description: 'Test brand description',
        country: 'Россия',
        website: 'https://example.com',
        foundedYear: 2020,
        status: 'Выпускается',
        imageUrl: 'https://example.com/image.jpg',
        rating: 4.5,
        ratingsCount: 100,
        reviewsCount: 50,
        viewsCount: 1000,
        lines: [],
        flavors: [],
      };

      db.setBrand(testBrand);

      // Save test flavor
      const testFlavor: Flavor = {
        slug: 'test-brand/test-line/test-flavor',
        name: 'Test Flavor',
        nameAlt: 'Test Flavor Alt',
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
        tags: ['Холодок', 'Сладкий', 'Фруктовый'],
        rating: 4.5,
        ratingsCount: 100,
        reviewsCount: 50,
        viewsCount: 1000,
        ratingDistribution: {
          count1: 5,
          count2: 10,
          count3: 20,
          count4: 40,
          count5: 25,
        },
        smokeAgainPercentage: 85,
        htreviewsId: 12345,
        dateAdded: new Date('2024-01-01'),
        addedBy: 'testuser',
      };

      db.setFlavor(testFlavor);

      // Verify brand integrity
      const retrievedBrand = db.getBrand('test-brand');
      expect(retrievedBrand).not.toBeNull();

      const brandFields = [
        'slug', 'name', 'nameEn', 'description', 'country',
        'website', 'foundedYear', 'status', 'imageUrl',
        'rating', 'ratingsCount', 'reviewsCount', 'viewsCount',
        'lines', 'flavors'
      ];

      brandFields.forEach(field => {
        expect(retrievedBrand).toHaveProperty(field);
      });

      console.log('✓ Brand data integrity verified: all required fields present');

      // Verify flavor integrity
      const retrievedFlavor = db.getFlavor('test-brand/test-line/test-flavor');
      expect(retrievedFlavor).not.toBeNull();

      const flavorFields = [
        'slug', 'name', 'nameAlt', 'description',
        'brandSlug', 'brandName', 'lineSlug', 'lineName',
        'country', 'officialStrength', 'userStrength', 'status',
        'imageUrl', 'tags', 'rating', 'ratingsCount',
        'reviewsCount', 'viewsCount', 'ratingDistribution',
        'smokeAgainPercentage', 'htreviewsId', 'dateAdded', 'addedBy'
      ];

      flavorFields.forEach(field => {
        expect(retrievedFlavor).toHaveProperty(field);
      });

      console.log('✓ Flavor data integrity verified: all required fields present');

      // Verify data types
      expect(typeof retrievedBrand!.rating).toBe('number');
      expect(typeof retrievedBrand!.ratingsCount).toBe('number');
      expect(typeof retrievedBrand!.reviewsCount).toBe('number');
      expect(typeof retrievedBrand!.viewsCount).toBe('number');
      expect(Array.isArray(retrievedBrand!.lines)).toBe(true);
      expect(Array.isArray(retrievedBrand!.flavors)).toBe(true);

      expect(typeof retrievedFlavor!.rating).toBe('number');
      expect(typeof retrievedFlavor!.ratingsCount).toBe('number');
      expect(typeof retrievedFlavor!.reviewsCount).toBe('number');
      expect(typeof retrievedFlavor!.viewsCount).toBe('number');
      expect(typeof retrievedFlavor!.htreviewsId).toBe('number');
      expect(typeof retrievedFlavor!.smokeAgainPercentage).toBe('number');
      expect(Array.isArray(retrievedFlavor!.tags)).toBe(true);
      expect(typeof retrievedFlavor!.ratingDistribution).toBe('object');
      expect(retrievedFlavor!.dateAdded).toBeInstanceOf(Date);

      console.log('✓ Data types verified: all fields have correct types');
    });
  });
});
