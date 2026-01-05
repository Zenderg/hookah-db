/**
 * Unit tests for Brand Scraper
 * 
 * Tests brand scraper functionality including:
 * - Scraping brands list from HTML
 * - Extracting all brand fields
 * - Handling edge cases and errors
 * - Testing with real HTML examples
 */

import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { HttpClient, Scraper, scrapeBrandsList } from '@hookah-db/scraper';

// ============================================================================
// Test Suite
// ============================================================================

describe('Brand Scraper', () => {
  let mockFetchAndParse: jest.SpyInstance;
  let mockHttpClientGet: jest.SpyInstance;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create a mock for the HTTP client's get method
    mockHttpClientGet = jest.spyOn(HttpClient.prototype, 'get');
    
    // Mock the Scraper's fetchAndParse to return Cheerio instance
    mockFetchAndParse = jest.spyOn(Scraper.prototype, 'fetchAndParse');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // Tests for scrapeBrandsList function
  // ============================================================================

  describe('scrapeBrandsList', () => {
    it('should scrape brands list successfully', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/dogma">
                  <span>Догма</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating">
                  <img src="/images/star.svg" alt="">
                  <span>4.6</span>
                </div>
                <div class="list_item_ratings_count">
                  <img src="/images/star2.svg" alt="">
                  <span>3124</span>
                </div>
                <div class="list_item_reviews">
                  <img src="/images/chat.svg" alt="">
                  <span>2952</span>
                </div>
                <div class="list_item_stats">
                  <img src="/images/eye.svg" alt="">
                  <span>319.1k</span>
                </div>
              </div>
              <div content>
                <div class="description_content">
                  <span>Test description</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(1);
      expect(brands[0].slug).toBe('dogma');
      expect(brands[0].name).toBe('Догма');
      expect(brands[0].country).toBe('Россия');
      expect(brands[0].rating).toBe(4.6);
      expect(brands[0].ratingsCount).toBe(3124);
      expect(brands[0].reviewsCount).toBe(2952);
      expect(brands[0].viewsCount).toBe(319100);
      expect(brands[0].description).toBe('Test description');
    });

    it('should extract all brand fields correctly', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div>
                <a class="tobacco_list_item_image" href="/tobaccos/test">
                  <img src="/images/no_image.webp" data-src="https://example.com/image.webp" alt="Test Brand">
                </a>
              </div>
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test-brand">
                  <span>Test Brand</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating">
                  <img src="/images/star.svg" alt="">
                  <span>4.5</span>
                </div>
                <div class="list_item_ratings_count">
                  <img src="/images/star2.svg" alt="">
                  <span>1000</span>
                </div>
                <div class="list_item_reviews">
                  <img src="/images/chat.svg" alt="">
                  <span>500</span>
                </div>
                <div class="list_item_stats">
                  <img src="/images/eye.svg" alt="">
                  <span>50.5k</span>
                </div>
              </div>
              <div content>
                <div class="description_content">
                  <span>Test brand description with detailed information</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(1);
      const brand = brands[0];
      
      expect(brand.slug).toBe('test-brand');
      expect(brand.name).toBe('Test Brand');
      expect(brand.nameEn).toBe('Test Brand');
      expect(brand.country).toBe('Россия');
      expect(brand.imageUrl).toBe('https://example.com/image.webp');
      expect(brand.rating).toBe(4.5);
      expect(brand.ratingsCount).toBe(1000);
      expect(brand.reviewsCount).toBe(500);
      expect(brand.viewsCount).toBe(50500);
      expect(brand.description).toBe('Test brand description with detailed information');
    });

    it('should handle both top brands and other brands sections', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/top-brand">
                  <span>Top Brand</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>5.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Top brand</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="tobacco_list_wrapper" data-active="0">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/other-brand">
                  <span>Other Brand</span>
                  <span class="country">США</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>3.5</span></div>
                <div class="list_item_ratings_count"><span>50</span></div>
                <div class="list_item_reviews"><span>25</span></div>
                <div class="list_item_stats"><span>5k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Other brand</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(2);
      expect(brands[0].slug).toBe('top-brand');
      expect(brands[1].slug).toBe('other-brand');
    });

    it('should combine results from both sections', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
                  <span>Brand 1</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Brand 1</span></div>
              </div>
            </div>
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/brand2">
                  <span>Brand 2</span>
                  <span class="country">США</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.5</span></div>
                <div class="list_item_ratings_count"><span>200</span></div>
                <div class="list_item_reviews"><span>100</span></div>
                <div class="list_item_stats"><span>20k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Brand 2</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="tobacco_list_wrapper" data-active="0">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/brand3">
                  <span>Brand 3</span>
                  <span class="country">Германия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>3.5</span></div>
                <div class="list_item_ratings_count"><span>50</span></div>
                <div class="list_item_reviews"><span>25</span></div>
                <div class="list_item_stats"><span>5k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Brand 3</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(3);
      expect(brands.map((b: any) => b.slug)).toEqual(['brand1', 'brand2', 'brand3']);
    });

    it('should return empty array when no brands found', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(0);
    });

    it('should return empty array on complete failure', async () => {
      mockFetchAndParse.mockRejectedValueOnce(new Error('Network error'));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(0);
    });

    it('should handle missing sections gracefully', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
                  <span>Brand 1</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Brand 1</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(1);
      expect(brands[0].slug).toBe('brand1');
    });

    it('should handle only other brands section', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="0">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
                  <span>Brand 1</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Brand 1</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(1);
      expect(brands[0].slug).toBe('brand1');
    });

    it('should skip brands with invalid slug', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/valid-brand">
                  <span>Valid Brand</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Valid</span></div>
              </div>
            </div>
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="">
                  <span>Invalid Brand</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>3.0</span></div>
                <div class="list_item_ratings_count"><span>50</span></div>
                <div class="list_item_reviews"><span>25</span></div>
                <div class="list_item_stats"><span>5k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Invalid</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(1);
      expect(brands[0].slug).toBe('valid-brand');
    });

    it('should continue parsing after individual brand parsing error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
                  <span>Brand 1</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Brand 1</span></div>
              </div>
            </div>
            <div class="tobacco_list_item">
              <!-- Missing required fields - will cause parsing error -->
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/brand2">
                  <span>Brand 2</span>
                </a>
              </div>
            </div>
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/brand3">
                  <span>Brand 3</span>
                  <span class="country">США</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>3.5</span></div>
                <div class="list_item_ratings_count"><span>50</span></div>
                <div class="list_item_reviews"><span>25</span></div>
                <div class="list_item_stats"><span>5k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Brand 3</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      // Should parse valid brands and skip invalid ones
      expect(brands.length).toBeGreaterThanOrEqual(1);
      expect(brands.some((b: any) => b.slug === 'brand1')).toBe(true);
      expect(brands.some((b: any) => b.slug === 'brand3')).toBe(true);
      
      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================================
  // Tests for data extraction
  // ============================================================================

  describe('Data Extraction', () => {
    it('should extract brand slug from href', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/sarma">
                  <span>Сарма</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].slug).toBe('sarma');
    });

    it('should extract brand name', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Тестовый Бренд</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].name).toBe('Тестовый Бренд');
    });

    it('should set nameEn to name', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test Brand</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].name).toBe('Test Brand');
      expect(brands[0].nameEn).toBe('Test Brand');
    });

    it('should extract country', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">США</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].country).toBe('США');
    });

    it('should extract image URL from data-src', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div>
                <a class="tobacco_list_item_image" href="/tobaccos/test">
                  <img src="/images/no_image.webp" data-src="https://example.com/image.webp" alt="Test">
                </a>
              </div>
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].imageUrl).toBe('https://example.com/image.webp');
    });

    it('should fallback to src when data-src is missing', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div>
                <a class="tobacco_list_item_image" href="/tobaccos/test">
                  <img src="https://example.com/image.webp" alt="Test">
                </a>
              </div>
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].imageUrl).toBe('https://example.com/image.webp');
    });

    it('should handle missing image URL', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].imageUrl).toBeNull();
    });

    it('should extract rating', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating">
                  <img src="/images/star.svg" alt="">
                  <span>4.7</span>
                </div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].rating).toBe(4.7);
    });

    it('should extract ratings count', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count">
                  <img src="/images/star2.svg" alt="">
                  <span>1234</span>
                </div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].ratingsCount).toBe(1234);
    });

    it('should extract reviews count', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews">
                  <img src="/images/chat.svg" alt="">
                  <span>5678</span>
                </div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].reviewsCount).toBe(5678);
    });

    it('should extract views count with k suffix', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats">
                  <img src="/images/eye.svg" alt="">
                  <span>319.1k</span>
                </div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].viewsCount).toBe(319100);
    });

    it('should extract views count with kk suffix', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats">
                  <img src="/images/eye.svg" alt="">
                  <span>1.9kk</span>
                </div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].viewsCount).toBe(1900000);
    });

    it('should extract views count without suffix', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats">
                  <img src="/images/eye.svg" alt="">
                  <span>1000</span>
                </div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].viewsCount).toBe(1000);
    });

    it('should extract description', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content">
                  <span>This is a detailed brand description with multiple sentences and information about brand.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].description).toBe('This is a detailed brand description with multiple sentences and information about brand.');
    });
  });

  // ============================================================================
  // Tests for edge cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty brands list', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(0);
    });

    it('should handle missing optional fields', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(1);
      expect(brands[0].imageUrl).toBeNull();
    });

    it('should handle malformed HTML', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(1);
    });

    it('should handle duplicate brands', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      // Should handle duplicates gracefully (both will be added)
      expect(brands).toHaveLength(2);
      expect(brands[0].slug).toBe('test');
      expect(brands[1].slug).toBe('test');
    });

    it('should handle rating with decimal', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.5</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].rating).toBe(4.5);
    });

    it('should handle integer rating', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Test</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].rating).toBe(4);
    });

    it('should handle missing description', async () => {
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/test">
                  <span>Test</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands[0].description).toBe('');
    });
  });

  // ============================================================================
  // Tests for error handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetchAndParse.mockRejectedValueOnce(new Error('Network error'));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(0);
    });

    it('should handle parsing errors', async () => {
      mockFetchAndParse.mockRejectedValueOnce(new Error('Parse error'));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(0);
    });

    it('should log errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockFetchAndParse.mockRejectedValueOnce(new Error('Test error'));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toHaveLength(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to scrape brands list:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('should return empty array on complete failure', async () => {
      mockFetchAndParse.mockRejectedValueOnce(new Error('Complete failure'));
      
      const brands = await scrapeBrandsList();
      
      expect(brands).toEqual([]);
    });

    it('should continue parsing after individual brand parsing error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const mockHtml = `
        <div class="tobacco_list_wrapper" data-active="1">
          <div class="tobacco_list_items">
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
                  <span>Brand 1</span>
                  <span class="country">Россия</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>4.0</span></div>
                <div class="list_item_ratings_count"><span>100</span></div>
                <div class="list_item_reviews"><span>50</span></div>
                <div class="list_item_stats"><span>10k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Brand 1</span></div>
              </div>
            </div>
            <div class="tobacco_list_item">
              <!-- Missing required fields - will cause parsing error -->
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="">
                  <span>Invalid Brand</span>
                </a>
              </div>
            </div>
            <div class="tobacco_list_item">
              <div class="tobacco_list_item_name">
                <a class="tobacco_list_item_slug" href="/tobaccos/brand2">
                  <span>Brand 2</span>
                  <span class="country">США</span>
                </a>
              </div>
              <div>
                <div class="list_item_rating"><span>3.5</span></div>
                <div class="list_item_ratings_count"><span>50</span></div>
                <div class="list_item_reviews"><span>25</span></div>
                <div class="list_item_stats"><span>5k</span></div>
              </div>
              <div content>
                <div class="description_content"><span>Brand 2</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(mockHtml));
      
      const brands = await scrapeBrandsList();
      
      expect(brands.length).toBeGreaterThanOrEqual(1);
      expect(brands.some((b: any) => b.slug === 'brand1')).toBe(true);
      expect(brands.some((b: any) => b.slug === 'brand2')).toBe(true);
      
      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================================
  // Tests using example HTML file
  // ============================================================================

  describe('Example HTML Tests', () => {
    it('should scrape brands from example HTML file', async () => {
      // Load example HTML file
      const exampleHtmlPath = path.join(__dirname, '../../../examples/htreviews.org_tobaccos_brands.html');
      const exampleHtml = fs.readFileSync(exampleHtmlPath, 'utf-8');
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(exampleHtml));
      
      const brands = await scrapeBrandsList();
      
      // Verify that brands were extracted
      expect(brands.length).toBeGreaterThan(0);
      
      // Verify first brand (Догма) - updated values from actual HTML
      expect(brands[0].slug).toBe('dogma');
      expect(brands[0].name).toBe('Догма');
      expect(brands[0].country).toBe('Россия');
      expect(brands[0].rating).toBe(4.6);
      expect(brands[0].ratingsCount).toBe(3124);
      expect(brands[0].reviewsCount).toBe(2952);
      expect(brands[0].viewsCount).toBe(319100);
      expect(brands[0].description).toContain('Бренд табака для кальяна на основе сигарного табачного листа');
    });

    it('should extract all brands from example HTML', async () => {
      const exampleHtmlPath = path.join(__dirname, '../../../examples/htreviews.org_tobaccos_brands.html');
      const exampleHtml = fs.readFileSync(exampleHtmlPath, 'utf-8');
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(exampleHtml));
      
      const brands = await scrapeBrandsList();
      
      // Should extract brands from both sections
      expect(brands.length).toBeGreaterThan(20);
      
      // Verify some known brands are present
      const brandSlugs = brands.map((b: any) => b.slug);
      expect(brandSlugs).toContain('dogma');
      expect(brandSlugs).toContain('bonche');
      expect(brandSlugs).toContain('satyr');
      expect(brandSlugs).toContain('kraken');
      expect(brandSlugs).toContain('sarma');
    });

    it('should verify brand data from example HTML', async () => {
      const exampleHtmlPath = path.join(__dirname, '../../../examples/htreviews.org_tobaccos_brands.html');
      const exampleHtml = fs.readFileSync(exampleHtmlPath, 'utf-8');
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(exampleHtml));
      
      const brands = await scrapeBrandsList();
      
      // Find Sarma brand - updated values from actual HTML
      const sarmaBrand = brands.find((b: any) => b.slug === 'sarma');
      expect(sarmaBrand).toBeDefined();
      expect(sarmaBrand?.name).toBe('Сарма');
      expect(sarmaBrand?.country).toBe('Россия');
      expect(sarmaBrand?.rating).toBe(4);
      expect(sarmaBrand?.ratingsCount).toBe(3035);
      expect(sarmaBrand?.reviewsCount).toBe(2798);
      expect(sarmaBrand?.viewsCount).toBe(230100);
      expect(sarmaBrand?.description).toContain('Наши ароматы — это воспоминания');
    });

    it('should verify DARKSIDE brand from example HTML', async () => {
      const exampleHtmlPath = path.join(__dirname, '../../../examples/htreviews.org_tobaccos_brands.html');
      const exampleHtml = fs.readFileSync(exampleHtmlPath, 'utf-8');
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(exampleHtml));
      
      const brands = await scrapeBrandsList();
      
      // Find DARKSIDE brand - updated values from actual HTML
      const darksideBrand = brands.find((b: any) => b.slug === 'darkside');
      expect(darksideBrand).toBeDefined();
      expect(darksideBrand?.name).toBe('DARKSIDE');
      expect(darksideBrand?.country).toBe('Россия');
      expect(darksideBrand?.rating).toBe(3.9);
      expect(darksideBrand?.ratingsCount).toBe(8982);
      expect(darksideBrand?.reviewsCount).toBe(8245);
      expect(darksideBrand?.viewsCount).toBe(1900000); // 1.9kk
    });

    it('should verify Tangiers brand from example HTML', async () => {
      const exampleHtmlPath = path.join(__dirname, '../../../examples/htreviews.org_tobaccos_brands.html');
      const exampleHtml = fs.readFileSync(exampleHtmlPath, 'utf-8');
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(exampleHtml));
      
      const brands = await scrapeBrandsList();
      
      // Find Tangiers brand - updated values from actual HTML
      const tangiersBrand = brands.find((b: any) => b.slug === 'tangiers');
      expect(tangiersBrand).toBeDefined();
      expect(tangiersBrand?.name).toBe('Tangiers');
      expect(tangiersBrand?.country).toBe('США');
      expect(tangiersBrand?.rating).toBe(4.3);
      expect(tangiersBrand?.ratingsCount).toBe(1085);
      expect(tangiersBrand?.reviewsCount).toBe(1040);
      expect(tangiersBrand?.viewsCount).toBe(245700);
    });

    it('should verify brands from both sections in example HTML', async () => {
      const exampleHtmlPath = path.join(__dirname, '../../../examples/htreviews.org_tobaccos_brands.html');
      const exampleHtml = fs.readFileSync(exampleHtmlPath, 'utf-8');
      
      mockFetchAndParse.mockResolvedValueOnce(cheerio.load(exampleHtml));
      
      const brands = await scrapeBrandsList();
      
      // Verify brands from top brands section (data-active="1")
      expect(brands.some((b: any) => b.slug === 'dogma')).toBe(true);
      expect(brands.some((b: any) => b.slug === 'bonche')).toBe(true);
      expect(brands.some((b: any) => b.slug === 'satyr')).toBe(true);
      
      // Verify brands from other brands section (data-active="0")
      expect(brands.some((b: any) => b.slug === 'lezzet')).toBe(true);
      expect(brands.some((b: any) => b.slug === 'dokhaman')).toBe(true);
      expect(brands.some((b: any) => b.slug === 'total-flame')).toBe(true);
    });
  });
});
