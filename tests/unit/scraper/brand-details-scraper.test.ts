/**
 * Unit Tests for Brand Details Scraper
 * 
 * Tests for scraping detailed brand information from htreviews.org including:
 * - Basic brand information
 * - Lines extraction
 * - Flavor URLs extraction
 * - Edge cases and error handling
 */

import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { scrapeBrandDetails, Scraper } from '../../src/scraper';

// ============================================================================
// Test Suite
// ============================================================================

describe('Brand Details Scraper', () => {
  let exampleHtml: string;

  beforeAll(() => {
    // Load example HTML file for realistic testing
    const examplePath = path.join(__dirname, '../../../examples/htreviews.org_tobaccos_sarma.html');
    exampleHtml = fs.readFileSync(examplePath, 'utf-8');
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // ============================================================================
  // Tests for scrapeBrandDetails function
  // ============================================================================

  describe('scrapeBrandDetails', () => {
    it('should scrape brand details successfully with complete data', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.slug).toBe('sarma');
      expect(brand?.name).toBe('Сарма');
      expect(brand?.nameEn).toBe('Sarma');
      expect(brand?.description).toContain('Наши ароматы');
      expect(brand?.country).toBe('Россия');
      expect(brand?.website).toBe('https://sarmatobacco.ru');
      expect(brand?.foundedYear).toBe(2022);
      expect(brand?.status).toBe('Выпускается');
      expect(brand?.imageUrl).toBe('https://htreviews.org/uploads/objects/5/8594df9a7f7469a4e63413f221dd95f9.webp');
      expect(brand?.rating).toBe(4);
      expect(brand?.ratingsCount).toBe(3035);
      expect(brand?.reviewsCount).toBe(2798);
      expect(brand?.viewsCount).toBe(230100);
      expect(brand?.lines).toBeDefined();
      expect(brand?.lines.length).toBeGreaterThan(0);
      expect(brand?.flavors).toBeDefined();
      expect(brand?.flavors.length).toBeGreaterThan(0);

      fetchAndParseSpy.mockRestore();
    });

    it('should extract lines correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.lines).toBeDefined();
      expect(brand?.lines.length).toBeGreaterThan(0);

      // Check first line
      const firstLine = brand?.lines[0];
      expect(firstLine?.slug).toBeDefined();
      expect(firstLine?.name).toBeDefined();
      expect(firstLine?.brandSlug).toBe('sarma');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract flavor URLs correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.flavors).toBeDefined();
      expect(brand?.flavors.length).toBeGreaterThan(0);

      // Check first flavor URL
      const firstFlavor = brand?.flavors[0];
      expect(firstFlavor).toBeDefined();
      expect(firstFlavor).toMatch(/^\/tobaccos\//);

      fetchAndParseSpy.mockRestore();
    });

    it('should return null when brand name is missing', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <span></span>
          </div>
        </div>
      `));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const brand = await scrapeBrandDetails('test');

      expect(brand).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to extract brand name')
      );

      consoleErrorSpy.mockRestore();
      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing optional fields', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.name).toBe('Test Brand');
      expect(brand?.nameEn).toBe('Test Brand');
      expect(brand?.description).toBe('');
      expect(brand?.country).toBe('Россия');
      expect(brand?.website).toBeNull();
      expect(brand?.foundedYear).toBeNull();
      expect(brand?.status).toBe('Выпускается');
      expect(brand?.imageUrl).toBeNull();
      expect(brand?.rating).toBe(0);
      expect(brand?.ratingsCount).toBe(100);
      expect(brand?.reviewsCount).toBe(0);
      expect(brand?.viewsCount).toBe(0);
      expect(brand?.lines).toEqual([]);
      expect(brand?.flavors).toEqual([]);

      fetchAndParseSpy.mockRestore();
    });

    it('should handle empty lines array', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.lines).toEqual([]);

      fetchAndParseSpy.mockRestore();
    });

    it('should handle empty flavors array', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.flavors).toEqual([]);

      fetchAndParseSpy.mockRestore();
    });

    it('should parse views count with "k" suffix', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.viewsCount).toBe(230100); // 230.1k

      fetchAndParseSpy.mockRestore();
    });

    it('should parse views count with "kk" suffix', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
            <div class="list_item_stats">
              <img src="/images/eye.svg" alt="">
              <span>1.9kk</span>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.viewsCount).toBe(1900000); // 1.9kk

      fetchAndParseSpy.mockRestore();
    });

    it('should parse views count without suffix', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
            <div class="list_item_stats">
              <img src="/images/eye.svg" alt="">
              <span>1000</span>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.viewsCount).toBe(1000);

      fetchAndParseSpy.mockRestore();
    });

    it('should parse founded year correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.foundedYear).toBe(2022);

      fetchAndParseSpy.mockRestore();
    });

    it('should parse website URL correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.website).toBe('https://sarmatobacco.ru');

      fetchAndParseSpy.mockRestore();
    });

    it('should parse description correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.description).toContain('Наши ароматы');

      fetchAndParseSpy.mockRestore();
    });

    it('should parse country correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.country).toBe('Россия');

      fetchAndParseSpy.mockRestore();
    });

    it('should parse status correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.status).toBe('Выпускается');

      fetchAndParseSpy.mockRestore();
    });

    it('should parse image URL correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.imageUrl).toBe('https://htreviews.org/uploads/objects/5/8594df9a7f7469a4e63413f221dd95f9.webp');

      fetchAndParseSpy.mockRestore();
    });

    it('should parse rating correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.rating).toBe(4);

      fetchAndParseSpy.mockRestore();
    });

    it('should parse ratings count correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.ratingsCount).toBe(3035);

      fetchAndParseSpy.mockRestore();
    });

    it('should parse reviews count correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.reviewsCount).toBe(2798);

      fetchAndParseSpy.mockRestore();
    });
  });

  // ============================================================================
  // Tests for lines extraction
  // ============================================================================

  describe('Lines Extraction', () => {
    it('should extract line name', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.lines.length).toBeGreaterThan(0);
      expect(brand?.lines[0].name).toBeDefined();
      expect(typeof brand?.lines[0].name).toBe('string');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract line slug', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.lines.length).toBeGreaterThan(0);
      expect(brand?.lines[0].slug).toBeDefined();
      expect(typeof brand?.lines[0].slug).toBe('string');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract line description', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.lines.length).toBeGreaterThan(0);
      expect(brand?.lines[0].description).toBeDefined();
      expect(typeof brand?.lines[0].description).toBe('string');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract line strength', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.lines.length).toBeGreaterThan(0);
      expect(brand?.lines[0].strength).toBeDefined();
      expect(typeof brand?.lines[0].strength).toBe('string');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract line status', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.lines.length).toBeGreaterThan(0);
      expect(brand?.lines[0].status).toBeDefined();
      expect(typeof brand?.lines[0].status).toBe('string');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract line flavors count', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.lines.length).toBeGreaterThan(0);
      expect(brand?.lines[0].flavorsCount).toBeDefined();
      expect(typeof brand?.lines[0].flavorsCount).toBe('number');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract line rating', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.lines.length).toBeGreaterThan(0);
      expect(brand?.lines[0].rating).toBeDefined();
      expect(typeof brand?.lines[0].rating).toBe('number');

      fetchAndParseSpy.mockRestore();
    });

    it('should set brandSlug for all lines', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.lines.length).toBeGreaterThan(0);
      brand?.lines.forEach(line => {
        expect(line.brandSlug).toBe('sarma');
      });

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing line fields', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.lines).toEqual([]);

      fetchAndParseSpy.mockRestore();
    });
  });

  // ============================================================================
  // Tests for flavor URLs extraction
  // ============================================================================

  describe('Flavor URLs Extraction', () => {
    it('should extract flavor URLs from HTML', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.flavors.length).toBeGreaterThan(0);
      expect(brand?.flavors[0]).toMatch(/^\/tobaccos\//);

      fetchAndParseSpy.mockRestore();
    });

    it('should prepend brandSlug to flavor URLs', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.flavors.length).toBeGreaterThan(0);
      brand?.flavors.forEach(flavorUrl => {
        expect(flavorUrl).toContain('/tobaccos/sarma/');
      });

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing flavor URLs', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.flavors).toEqual([]);

      fetchAndParseSpy.mockRestore();
    });

    it('should remove duplicate flavor URLs', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.flavors.length).toBeGreaterThan(0);

      // Check for duplicates
      const uniqueFlavors = new Set(brand?.flavors);
      expect(uniqueFlavors.size).toBe(brand?.flavors.length);

      fetchAndParseSpy.mockRestore();
    });
  });

  // ============================================================================
  // Tests for error handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should return null on network error', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      fetchAndParseSpy.mockRestore();
    });

    it('should log error on network failure', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await scrapeBrandDetails('sarma');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      fetchAndParseSpy.mockRestore();
    });

    it('should return null on parsing error', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockRejectedValue(new Error('Parsing error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      fetchAndParseSpy.mockRestore();
    });

    it('should return null when brand name extraction fails', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <span></span>
          </div>
        </div>
      `));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const brand = await scrapeBrandDetails('test');

      expect(brand).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to extract brand name')
      );

      consoleErrorSpy.mockRestore();
      fetchAndParseSpy.mockRestore();
    });
  });

  // ============================================================================
  // Tests with real example HTML
  // ============================================================================

  describe('Real Example HTML Tests', () => {
    it('should successfully scrape Sarma brand from example HTML', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.slug).toBe('sarma');
      expect(brand?.name).toBe('Сарма');
      expect(brand?.nameEn).toBe('Sarma');
      expect(brand?.description).toContain('Наши ароматы');
      expect(brand?.country).toBe('Россия');
      expect(brand?.website).toBe('https://sarmatobacco.ru');
      expect(brand?.foundedYear).toBe(2022);
      expect(brand?.status).toBe('Выпускается');
      expect(brand?.imageUrl).toBe('https://htreviews.org/uploads/objects/5/8594df9a7f7469a4e63413f221dd95f9.webp');
      expect(brand?.rating).toBe(4);
      expect(brand?.ratingsCount).toBe(3035);
      expect(brand?.reviewsCount).toBe(2798);
      expect(brand?.viewsCount).toBe(230100);

      fetchAndParseSpy.mockRestore();
    });

    it('should extract lines from example HTML', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.lines).toBeDefined();
      expect(brand?.lines.length).toBeGreaterThan(0);

      // Verify line structure
      const firstLine = brand?.lines[0];
      expect(firstLine?.slug).toBeDefined();
      expect(firstLine?.name).toBeDefined();
      expect(firstLine?.description).toBeDefined();
      expect(firstLine?.strength).toBeDefined();
      expect(firstLine?.status).toBeDefined();
      expect(firstLine?.flavorsCount).toBeDefined();
      expect(firstLine?.rating).toBeDefined();
      expect(firstLine?.brandSlug).toBe('sarma');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract flavor URLs from example HTML', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.flavors).toBeDefined();
      expect(brand?.flavors.length).toBeGreaterThan(0);

      // Verify flavor URL format
      brand?.flavors.forEach(flavorUrl => {
        expect(flavorUrl).toMatch(/^\/tobaccos\/sarma\//);
      });

      fetchAndParseSpy.mockRestore();
    });

    it('should extract all required fields from example HTML', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();

      // Verify all required fields are present
      expect(brand?.slug).toBeDefined();
      expect(brand?.name).toBeDefined();
      expect(brand?.nameEn).toBeDefined();
      expect(brand?.description).toBeDefined();
      expect(brand?.country).toBeDefined();
      expect(brand?.status).toBeDefined();
      expect(brand?.rating).toBeDefined();
      expect(brand?.ratingsCount).toBeDefined();
      expect(brand?.reviewsCount).toBeDefined();
      expect(brand?.viewsCount).toBeDefined();
      expect(brand?.lines).toBeDefined();
      expect(brand?.flavors).toBeDefined();

      // Verify optional fields are present or null
      expect(brand?.website).toBeDefined();
      expect(brand?.foundedYear).toBeDefined();
      expect(brand?.imageUrl).toBeDefined();

      fetchAndParseSpy.mockRestore();
    });

    it('should handle all lines in example HTML', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.lines).toBeDefined();
      expect(brand?.lines.length).toBeGreaterThan(0);

      // Verify all lines have brandSlug
      brand?.lines.forEach(line => {
        expect(line.brandSlug).toBe('sarma');
      });

      fetchAndParseSpy.mockRestore();
    });

    it('should handle all flavors in example HTML', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.flavors).toBeDefined();
      expect(brand?.flavors.length).toBeGreaterThan(0);

      // Verify no duplicate flavor URLs
      const uniqueFlavors = new Set(brand?.flavors);
      expect(uniqueFlavors.size).toBe(brand?.flavors.length);

      fetchAndParseSpy.mockRestore();
    });
  });

  // ============================================================================
  // Tests for edge cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle missing description', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.description).toBe('');

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing website', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.website).toBeNull();

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing founded year', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.foundedYear).toBeNull();

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing image', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.imageUrl).toBeNull();

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing rating', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.rating).toBe(0);

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing ratings count', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.ratingsCount).toBe(0);

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing reviews count', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.reviewsCount).toBe(0);

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing views count', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.viewsCount).toBe(0);

      fetchAndParseSpy.mockRestore();
    });

    it('should handle empty nameEn', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
            <span></span>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.nameEn).toBe('Test Brand');

      fetchAndParseSpy.mockRestore();
    });

    it('should use provided brandSlug in returned data', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card_title">
            <h1>Test Brand</h1>
          </div>
          <div class="object_info_item">
            <span>Страна</span>
            <span></span>
            <span>Россия</span>
          </div>
          <div class="object_info_item" data-id="1">
            <span>Статус</span>
            <span></span>
            <span>Выпускается</span>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="4.0"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('custom-slug');

      expect(brand).not.toBeNull();
      expect(brand?.slug).toBe('custom-slug');

      fetchAndParseSpy.mockRestore();
    });
  });
});
