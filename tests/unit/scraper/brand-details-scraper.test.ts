/**
 * Unit Tests for Brand Details Scraper
 * 
 * Tests for scraping detailed brand information from htreviews.org including:
 * - Basic brand information
 * - Lines list
 * - Flavor URLs extraction
 * - Rating distribution
 * - Smoke again percentage
 * - Edge cases and error handling
 */

import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { scrapeBrandDetails, Scraper } from '@hookah-db/scraper';
import { Brand, Line } from '@hookah-db/types';

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
      expect(brand?.country).toBe('Россия');
      expect(brand?.website).toBe('http://sarmahookah.ru');
      expect(brand?.foundedYear).toBe(2018);
      expect(brand?.status).toBe('Выпускается');
      expect(brand?.rating).toBe(4);
      expect(brand?.ratingsCount).toBe(3035);
      expect(brand?.reviewsCount).toBe(2798);
      expect(brand?.viewsCount).toBe(230100);
      expect(brand?.lines).toHaveLength(3);
      expect(brand?.flavors).toEqual([]);

      fetchAndParseSpy.mockRestore();
    });

    it('should extract brand description correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.description).toContain('Наши ароматы — это воспоминания');
      expect(brand?.description).toContain('Легкая Сарма 360°');
      expect(brand?.description).toContain('Классическая Сарма');
      expect(brand?.description).toContain('Крепкая Сарма 360°');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract image URL correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.imageUrl).toBe('https://htreviews.org/uploads/objects/6/73e3f550285a2fecadbf77982df295c6.webp');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract all lines with complete data', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.lines).toHaveLength(3);

      const klassicheskaya = brand?.lines.find((l: Line) => l.slug === 'sarma/klassicheskaya');
      expect(klassicheskaya).toBeDefined();
      expect(klassicheskaya?.name).toBe('Классическая');
      expect(klassicheskaya?.description).toContain('Отправься в путешествие');
      expect(klassicheskaya?.strength).toBe('Средняя');
      expect(klassicheskaya?.status).toBe('Выпускается');
      expect(klassicheskaya?.flavorsCount).toBe(53);
      expect(klassicheskaya?.rating).toBe(4);
      expect(klassicheskaya?.brandSlug).toBe('sarma');

      const krepkaya = brand?.lines.find((l: Line) => l.slug === 'sarma/krepkaya-sarma-360');
      expect(krepkaya).toBeDefined();
      expect(krepkaya?.name).toBe('Крепкая Сарма 360');
      expect(krepkaya?.strength).toBe('Средне-крепкая');
      expect(krepkaya?.flavorsCount).toBe(21);

      const legkaya = brand?.lines.find((l: Line) => l.slug === 'sarma/legkaya-sarma-360');
      expect(legkaya).toBeDefined();
      expect(legkaya?.name).toBe('Легкая Сарма 360');
      expect(legkaya?.strength).toBe('Лёгкая');
      expect(legkaya?.flavorsCount).toBe(20);
      expect(legkaya?.rating).toBe(4.1);

      fetchAndParseSpy.mockRestore();
    });

    it('should handle decimal line ratings', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');
      const legkayaLine = brand?.lines.find((l: Line) => l.slug === 'sarma/legkaya-sarma-360');

      expect(legkayaLine?.rating).toBe(4.1);

      fetchAndParseSpy.mockRestore();
    });

    it('should return null when brand name is not found', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <span>No h1 tag here</span>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('unknown');

      expect(brand).toBeNull();

      fetchAndParseSpy.mockRestore();
    });

    it('should use brand slug in returned data', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.slug).toBe('sarma');
      expect(brand?.lines[0].brandSlug).toBe('sarma');
      expect(brand?.lines[1].brandSlug).toBe('sarma');
      expect(brand?.lines[2].brandSlug).toBe('sarma');

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing English name and fall back to Russian name', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Бренд</h1>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test-brand');

      expect(brand).not.toBeNull();
      expect(brand?.name).toBe('Бренд');
      expect(brand?.nameEn).toBe('Бренд');

      fetchAndParseSpy.mockRestore();
    });

    it('should handle empty lines list', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="brand_lines">
            <div class="brand_lines_list"></div>
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
  // Tests for Helper Functions
  // ============================================================================

  describe('extractBrandBasicInfo', () => {
    it('should extract all basic brand info fields', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.slug).toBeDefined();
      expect(brand?.name).toBeDefined();
      expect(brand?.nameEn).toBeDefined();
      expect(brand?.description).toBeDefined();
      expect(brand?.country).toBeDefined();
      expect(brand?.website).toBeDefined();
      expect(brand?.foundedYear).toBeDefined();
      expect(brand?.status).toBeDefined();
      expect(brand?.imageUrl).toBeDefined();
      expect(brand?.rating).toBeDefined();
      expect(brand?.ratingsCount).toBeDefined();
      expect(brand?.reviewsCount).toBeDefined();
      expect(brand?.viewsCount).toBeDefined();

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing optional fields gracefully', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_image">
              <img src="https://example.com/image.jpg" alt="Test">
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                  <div><span>50</span></div>
                  <div><span>10k</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.website).toBeNull();
      expect(brand?.foundedYear).toBeNull();
      expect(brand?.description).toBe('');
      expect(brand?.status).toBe('');

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing image', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
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
  });

  describe('extractCountry', () => {
    it('should extract country from object_info_item', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.country).toBe('Россия');

      fetchAndParseSpy.mockRestore();
    });

    it('should return empty string when country not found', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Other Field</span>
                <div>Value</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.country).toBe('');

      fetchAndParseSpy.mockRestore();
    });
  });

  describe('extractFoundedYearText', () => {
    it('should extract founded year correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.foundedYear).toBe(2018);

      fetchAndParseSpy.mockRestore();
    });

    it('should return null when founded year not found', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
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
  });

  describe('extractStatus', () => {
    it('should extract status from data-id="1" item', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.status).toBe('Выпускается');

      fetchAndParseSpy.mockRestore();
    });

    it('should return empty string when status not found', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.status).toBe('');

      fetchAndParseSpy.mockRestore();
    });
  });

  describe('extractLines', () => {
    it('should extract all lines from brand_lines_list', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.lines).toHaveLength(3);
      expect(brand?.lines.map((l: Line) => l.slug)).toEqual([
        'sarma/klassicheskaya',
        'sarma/krepkaya-sarma-360',
        'sarma/legkaya-sarma-360'
      ]);

      fetchAndParseSpy.mockRestore();
    });

    it('should extract line descriptions', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');
      const klassicheskaya = brand?.lines.find((l: Line) => l.slug === 'sarma/klassicheskaya');

      expect(klassicheskaya?.description).toContain('Отправься в путешествие');
      expect(klassicheskaya?.description).toContain('Натуральная ароматика');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract line strengths', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.lines[0].strength).toBe('Средняя');
      expect(brand?.lines[1].strength).toBe('Средне-крепкая');
      expect(brand?.lines[2].strength).toBe('Лёгкая');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract line statuses', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.lines.every((l: Line) => l.status === 'Выпускается')).toBe(true);

      fetchAndParseSpy.mockRestore();
    });

    it('should extract flavors count for each line', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.lines[0].flavorsCount).toBe(53);
      expect(brand?.lines[1].flavorsCount).toBe(21);
      expect(brand?.lines[2].flavorsCount).toBe(20);

      fetchAndParseSpy.mockRestore();
    });

    it('should handle line with missing description', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="brand_lines">
            <div class="brand_lines_list">
              <div class="brand_lines_item">
                <div class="lines_item_title">
                  <a class="lines_item_name" href="/tobaccos/test/line1">
                    <h3>line 1</h3>
                  </a>
                </div>
                <div class="lines_item_tobaccos">
                  <span>10 вкусов</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.lines).toHaveLength(1);
      expect(brand?.lines[0].description).toBeNull();

      fetchAndParseSpy.mockRestore();
    });

    it('should skip lines with missing slug', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="brand_lines">
            <div class="brand_lines_list">
              <div class="brand_lines_item">
                <div class="lines_item_title">
                  <h3>Line Without Link</h3>
                </div>
                <div class="lines_item_tobaccos">
                  <span>10 вкусов</span>
                </div>
              </div>
              <div class="brand_lines_item">
                <div class="lines_item_title">
                  <a class="lines_item_name" href="/tobaccos/test/line1">
                    <h3>Line 1</h3>
                  </a>
                </div>
                <div class="lines_item_tobaccos">
                  <span>10 вкусов</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.lines).toHaveLength(1);
      // extractSlugFromUrl removes "tobaccos/" prefix, so the result is "test/line1"
      expect(brand?.lines[0].slug).toBe('test/line1');

      fetchAndParseSpy.mockRestore();
    });
  });

  describe('parseLineItem', () => {
    it('should extract all line fields correctly', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');
      const line = brand?.lines[0];

      expect(line?.slug).toBeDefined();
      expect(line?.name).toBeDefined();
      expect(line?.description).toBeDefined();
      expect(line?.strength).toBeDefined();
      expect(line?.status).toBeDefined();
      expect(line?.flavorsCount).toBeDefined();
      expect(line?.rating).toBeDefined();
      expect(line?.brandSlug).toBeDefined();

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing line rating', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="brand_lines">
            <div class="brand_lines_list">
              <div class="brand_lines_item">
                <div class="lines_item_title">
                  <a class="lines_item_name" href="/tobaccos/test/line1">
                    <h3>Line 1</h3>
                  </a>
                  <div class="lines_item_score">
                    <span>No rating</span>
                  </div>
                </div>
                <div class="lines_item_tobaccos">
                  <span>10 вкусов</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.lines[0].rating).toBe(0);

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing line strength', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="brand_lines">
            <div class="brand_lines_list">
              <div class="brand_lines_item">
                <div class="lines_item_title">
                  <a class="lines_item_name" href="/tobaccos/test/line1">
                    <h3>Line 1</h3>
                  </a>
                </div>
                <div class="lines_item_tobaccos">
                  <span>10 вкусов</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.lines[0].strength).toBeNull();

      fetchAndParseSpy.mockRestore();
    });
  });

  describe('extractFlavorUrls', () => {
    it('should handle empty flavor list', async () => {
      const htmlWithoutFlavors = `
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="brand_lines">
            <div class="brand_lines_list"></div>
          </div>
          <div class="tobacco_list_items" data-count="0">
          </div>
        </div>
      `;

      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(htmlWithoutFlavors));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.flavors).toEqual([]);

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing tobacco_list_items section', async () => {
      const htmlWithoutFlavorSection = `
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="brand_lines">
            <div class="brand_lines_list"></div>
          </div>
        </div>
      `;

      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(htmlWithoutFlavorSection));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.flavors).toEqual([]);

      fetchAndParseSpy.mockRestore();
    });

    it('should handle malformed flavor URLs gracefully', async () => {
      const htmlWithMalformedUrls = `
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="brand_lines">
            <div class="brand_lines_list"></div>
          </div>
          <div class="tobacco_list_items" data-count="2">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="">
                  <span>Flavor 1</span>
                </a>
              </div>
            </div>
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="   ">
                  <span>Flavor 2</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      `;

      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(htmlWithMalformedUrls));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.flavors).toEqual([]);

      fetchAndParseSpy.mockRestore();
    });
  });

  // ============================================================================
  // Tests for Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle missing website', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
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
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
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

    it('should handle missing status', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.status).toBe('');

      fetchAndParseSpy.mockRestore();
    });

    it('should handle empty lines list', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="brand_lines">
            <div class="brand_lines_list"></div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.lines).toEqual([]);

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing rating distribution', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
          </div>
          <div class="object_card_info">
            <div class="object_info_item">
              <span>Страна</span>
              <div>Россия</div>
            </div>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="3"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing smoke again percentage', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
          </div>
          <div class="object_card_info">
            <div class="object_info_item">
              <span>Страна</span>
              <div>Россия</div>
            </div>
          </div>
          <div class="object_stats">
            <div class="score_graphic">
              <div data-rating="3"></div>
              <div data-stats="1">
                <div><span>100</span></div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();

      fetchAndParseSpy.mockRestore();
    });

    it('should handle invalid founded year and return null', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Год основания</span>
                <div>N/A</div>
              </div>
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
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
  });

  // ============================================================================
  // Tests for Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should return null on network error', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockRejectedValue(new Error('Network error'));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).toBeNull();

      fetchAndParseSpy.mockRestore();
    });

    it('should return null on parsing error', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load('invalid html'));

      const brand = await scrapeBrandDetails('test');

      expect(brand).toBeNull();

      fetchAndParseSpy.mockRestore();
    });

    it('should return null when brand name not found', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <span>No h1 here</span>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).toBeNull();

      fetchAndParseSpy.mockRestore();
    });

    it('should skip lines with missing slug gracefully', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="brand_lines">
            <div class="brand_lines_list">
              <div class="brand_lines_item">
                <div class="lines_item_title">
                  <h3>Invalid Line</h3>
                </div>
              </div>
              <div class="brand_lines_item">
                <div class="lines_item_title">
                  <a class="lines_item_name" href="/tobaccos/test/valid-line">
                    <h3>Valid Line</h3>
                  </a>
                </div>
                <div class="lines_item_tobaccos">
                  <span>10 вкусов</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.lines).toHaveLength(1);
      // extractSlugFromUrl removes "tobaccos/" prefix, so the result is "test/valid-line"
      expect(brand?.lines[0].slug).toBe('test/valid-line');

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing rating attribute gracefully', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
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
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `));

      const brand = await scrapeBrandDetails('test');

      expect(brand).not.toBeNull();
      expect(brand?.ratingsCount).toBe(100);

      fetchAndParseSpy.mockRestore();
    });

    it('should handle missing reviews count', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(`
        <div class="object_wrapper">
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
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
          <div class="object_card">
            <div class="object_card_title">
              <h1>Test Brand</h1>
              <span>Test Brand</span>
            </div>
            <div class="object_card_info">
              <div class="object_info_item">
                <span>Страна</span>
                <div>Россия</div>
              </div>
            </div>
            <div class="object_stats">
              <div class="score_graphic">
                <div data-rating="3"></div>
                <div data-stats="1">
                  <div><span>100</span></div>
                </div>
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
  });

  // ============================================================================
  // Tests with Real Example HTML
  // ============================================================================

  describe('Real Example HTML Tests', () => {
    it('should successfully scrape Sarma brand from example HTML', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand).not.toBeNull();
      expect(brand?.slug).toBe('sarma');
      expect(brand?.name).toBe('Сарма');
      expect(brand?.nameEn).toBe('Sarma');
      expect(brand?.country).toBe('Россия');
      expect(brand?.website).toBe('http://sarmahookah.ru');
      expect(brand?.foundedYear).toBe(2018);
      expect(brand?.status).toBe('Выпускается');
      expect(brand?.rating).toBe(4);
      expect(brand?.ratingsCount).toBe(3035);
      expect(brand?.reviewsCount).toBe(2798);
      expect(brand?.viewsCount).toBe(230100);

      fetchAndParseSpy.mockRestore();
    });

    it('should extract all lines from Sarma example HTML', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.lines).toHaveLength(3);

      const lineSlugs = brand?.lines.map((l: Line) => l.slug);
      expect(lineSlugs).toContain('sarma/klassicheskaya');
      expect(lineSlugs).toContain('sarma/krepkaya-sarma-360');
      expect(lineSlugs).toContain('sarma/legkaya-sarma-360');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract correct line details from Sarma example HTML', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      const klassicheskaya = brand?.lines.find((l: Line) => l.slug === 'sarma/klassicheskaya');
      expect(klassicheskaya?.name).toBe('Классическая');
      expect(klassicheskaya?.strength).toBe('Средняя');
      expect(klassicheskaya?.flavorsCount).toBe(53);
      expect(klassicheskaya?.rating).toBe(4);
      expect(klassicheskaya?.status).toBe('Выпускается');
      expect(klassicheskaya?.description).toContain('Отправься в путешествие');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract brand description correctly from example HTML', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.description).toContain('Наши ароматы — это воспоминания');
      expect(brand?.description).toContain('Легкая Сарма 360°');
      expect(brand?.description).toContain('Классическая Сарма');
      expect(brand?.description).toContain('Крепкая Сарма 360°');

      fetchAndParseSpy.mockRestore();
    });

    it('should extract brand image URL from example HTML', async () => {
      const fetchAndParseSpy = jest.spyOn(Scraper.prototype, 'fetchAndParse').mockResolvedValue(cheerio.load(exampleHtml));

      const brand = await scrapeBrandDetails('sarma');

      expect(brand?.imageUrl).toBe('https://htreviews.org/uploads/objects/6/73e3f550285a2fecadbf77982df295c6.webp');

      fetchAndParseSpy.mockRestore();
    });
  });
});
