/**
 * Unit Tests for Scraper Class
 */

import { Scraper, ScrapeError, ScraperConfig, ScrapeResult } from '@hookah-db/scraper';
import { HttpClient } from '@hookah-db/scraper';
import * as cheerio from 'cheerio';
import { AxiosResponse, AxiosHeaders } from 'axios';

// ============================================================================
// Mocks
// ============================================================================

/**
 * Create a proper mock Axios response
 */
const createMockResponse = (data: string): AxiosResponse<string> => {
  const headers = new AxiosHeaders();
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers,
    config: {
      headers,
    },
  };
};

// ============================================================================
// Test Suite
// ============================================================================

describe('Scraper', () => {
  let scraper: Scraper;
  let httpClient: HttpClient;
  let mockGet: jest.SpyInstance;

  beforeEach(() => {
    // Create a new scraper instance
    scraper = new Scraper({ baseURL: 'https://htreviews.org' });
    
    // Get the HTTP client instance
    httpClient = scraper.getHttpClient();
    
    // Mock get method
    mockGet = jest.spyOn(httpClient, 'get');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // ============================================================================
  // Scraper Initialization Tests
  // ============================================================================

  describe('Initialization', () => {
    it('should create a scraper instance with default config', () => {
      const defaultScraper = new Scraper();
      expect(defaultScraper).toBeInstanceOf(Scraper);
      expect(defaultScraper.getBaseURL()).toBe('https://htreviews.org');
    });

    it('should create a scraper instance with custom baseURL', () => {
      const customScraper = new Scraper({ baseURL: 'https://example.com' });
      expect(customScraper.getBaseURL()).toBe('https://example.com');
    });

    it('should use environment variable for baseURL if not provided', () => {
      const originalEnv = process.env.HTREVIEWS_BASE_URL;
      process.env.HTREVIEWS_BASE_URL = 'https://custom-url.com';
      
      const envScraper = new Scraper();
      expect(envScraper.getBaseURL()).toBe('https://custom-url.com');
      
      process.env.HTREVIEWS_BASE_URL = originalEnv;
    });

    it('should prioritize explicit baseURL over environment variable', () => {
      const originalEnv = process.env.HTREVIEWS_BASE_URL;
      process.env.HTREVIEWS_BASE_URL = 'https://env-url.com';
      
      const explicitScraper = new Scraper({ baseURL: 'https://explicit-url.com' });
      expect(explicitScraper.getBaseURL()).toBe('https://explicit-url.com');
      
      process.env.HTREVIEWS_BASE_URL = originalEnv;
    });
  });

  // ============================================================================
  // fetchHtml Method Tests
  // ============================================================================

  describe('fetchHtml', () => {
    it('should fetch HTML successfully', async () => {
      const testHtml = '<html><body>Test Content</body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));

      const html = await scraper.fetchHtml('/test');
      
      expect(html).toBe(testHtml);
      expect(mockGet).toHaveBeenCalledWith('/test');
    });

    it('should fetch HTML from different paths', async () => {
      const testHtml = '<html><body>Different Content</body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));

      const html = await scraper.fetchHtml('/tobaccos/brands');
      
      expect(html).toBe(testHtml);
      expect(mockGet).toHaveBeenCalledWith('/tobaccos/brands');
    });

    it('should throw ScrapeError on HTTP client error', async () => {
      const error = new Error('Network error');
      mockGet.mockRejectedValueOnce(error);

      await expect(scraper.fetchHtml('/test')).rejects.toThrow(ScrapeError);
    });

    it('should include URL in ScrapeError when fetch fails', async () => {
      const error = new Error('Network error');
      mockGet.mockRejectedValueOnce(error);

      try {
        await scraper.fetchHtml('/test');
        fail('Should have thrown ScrapeError');
      } catch (err) {
        expect(err).toBeInstanceOf(ScrapeError);
        const scrapeError = err as ScrapeError;
        expect(scrapeError.url).toBe('https://htreviews.org/test');
        expect(scrapeError.message).toContain('https://htreviews.org/test');
      }
    });

    it('should include original error in ScrapeError', async () => {
      const originalError = new Error('Original error message');
      mockGet.mockRejectedValueOnce(originalError);

      try {
        await scraper.fetchHtml('/test');
        fail('Should have thrown ScrapeError');
      } catch (err) {
        expect(err).toBeInstanceOf(ScrapeError);
        const scrapeError = err as ScrapeError;
        expect(scrapeError.originalError).toBe(originalError);
      }
    });

    it('should handle non-Error objects in originalError', async () => {
      mockGet.mockRejectedValueOnce('String error');

      try {
        await scraper.fetchHtml('/test');
        fail('Should have thrown ScrapeError');
      } catch (err) {
        expect(err).toBeInstanceOf(ScrapeError);
        const scrapeError = err as ScrapeError;
        expect(scrapeError.originalError).toBeUndefined();
      }
    });
  });

  // ============================================================================
  // fetchAndParse Method Tests
  // ============================================================================

  describe('fetchAndParse', () => {
    it('should fetch and parse HTML successfully', async () => {
      const testHtml = '<html><body><div class="test">Test Content</div></body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));

      const $ = await scraper.fetchAndParse('/test');
      
      expect($('.test').text()).toBe('Test Content');
      expect(mockGet).toHaveBeenCalledWith('/test');
    });

    it('should return Cheerio instance', async () => {
      const testHtml = '<html><body>Test</body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));

      const $ = await scraper.fetchAndParse('/test');
      
      expect(typeof $).toBe('function');
      expect($('body').length).toBe(1);
    });

    it('should allow querying parsed HTML', async () => {
      const testHtml = `
        <html>
          <body>
            <h1>Title</h1>
            <p class="description">Description</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </body>
        </html>
      `;
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));

      const $ = await scraper.fetchAndParse('/test');
      
      expect($('h1').text()).toBe('Title');
      expect($('.description').text()).toBe('Description');
      expect($('li').length).toBe(2);
    });

    it('should throw ScrapeError when fetch fails', async () => {
      const error = new Error('Network error');
      mockGet.mockRejectedValueOnce(error);

      await expect(scraper.fetchAndParse('/test')).rejects.toThrow(ScrapeError);
    });

    it('should handle empty HTML', async () => {
      const testHtml = '';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));

      const $ = await scraper.fetchAndParse('/test');
      
      // Cheerio automatically wraps content in HTML tags
      expect($('html').length).toBe(1);
    });
  });

  // ============================================================================
  // fetchHtmlWithResult Method Tests
  // ============================================================================

  describe('fetchHtmlWithResult', () => {
    it('should fetch HTML with full result metadata', async () => {
      const testHtml = '<html><body>Test Content</body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));

      const result = await scraper.fetchHtmlWithResult('/test');
      
      expect(result.data).toBe(testHtml);
      expect(result.url).toBe('https://htreviews.org/test');
      expect(result.html).toBe(testHtml);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockGet).toHaveBeenCalledWith('/test');
    });

    it('should include correct timestamp', async () => {
      const testHtml = '<html><body>Test</body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));
      
      const beforeFetch = new Date();
      const result = await scraper.fetchHtmlWithResult('/test');
      const afterFetch = new Date();
      
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeFetch.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterFetch.getTime());
    });

    it('should include URL in result', async () => {
      const testHtml = '<html><body>Test</body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));

      const result = await scraper.fetchHtmlWithResult('/tobaccos/brands');
      
      expect(result.url).toBe('https://htreviews.org/tobaccos/brands');
    });

    it('should throw ScrapeError when fetch fails', async () => {
      const error = new Error('Network error');
      mockGet.mockRejectedValueOnce(error);

      await expect(scraper.fetchHtmlWithResult('/test')).rejects.toThrow(ScrapeError);
    });

    it('should handle different paths correctly', async () => {
      const testHtml = '<html><body>Test</body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));

      const result = await scraper.fetchHtmlWithResult('/api/v1/data');
      
      expect(result.url).toBe('https://htreviews.org/api/v1/data');
    });
  });

  // ============================================================================
  // fetchAndParseWithResult Method Tests
  // ============================================================================

  describe('fetchAndParseWithResult', () => {
    it('should fetch and parse HTML with full result metadata', async () => {
      const testHtml = '<html><body><div class="test">Test Content</div></body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));

      const result = await scraper.fetchAndParseWithResult('/test');
      
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('function');
      expect(result.url).toBe('https://htreviews.org/test');
      expect(result.html).toBe(testHtml);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockGet).toHaveBeenCalledWith('/test');
    });

    it('should return Cheerio instance in data field', async () => {
      const testHtml = '<html><body><div class="test">Content</div></body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));

      const result = await scraper.fetchAndParseWithResult('/test');
      
      expect(result.data('.test').text()).toBe('Content');
    });

    it('should include correct timestamp', async () => {
      const testHtml = '<html><body>Test</body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));
      
      const beforeFetch = new Date();
      const result = await scraper.fetchAndParseWithResult('/test');
      const afterFetch = new Date();
      
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeFetch.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterFetch.getTime());
    });

    it('should include URL and HTML in result', async () => {
      const testHtml = '<html><body>Test</body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));

      const result = await scraper.fetchAndParseWithResult('/test');
      
      expect(result.url).toBe('https://htreviews.org/test');
      expect(result.html).toBe(testHtml);
    });

    it('should throw ScrapeError when fetch fails', async () => {
      const error = new Error('Network error');
      mockGet.mockRejectedValueOnce(error);

      await expect(scraper.fetchAndParseWithResult('/test')).rejects.toThrow(ScrapeError);
    });

    it('should allow querying parsed HTML from result', async () => {
      const testHtml = `
        <html>
          <body>
            <h1>Title</h1>
            <p class="text">Paragraph</p>
          </body>
        </html>
      `;
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));

      const result = await scraper.fetchAndParseWithResult('/test');
      
      expect(result.data('h1').text()).toBe('Title');
      expect(result.data('.text').text()).toBe('Paragraph');
    });
  });

  // ============================================================================
  // Helper Methods Tests
  // ============================================================================

  describe('buildUrl', () => {
    it('should build URL with path', () => {
      // Access protected method via type assertion for testing
      const url = (scraper as any).buildUrl('/test');
      expect(url).toBe('https://htreviews.org/test');
    });

    it('should handle path without leading slash', () => {
      const url = (scraper as any).buildUrl('test');
      expect(url).toBe('https://htreviews.org/test');
    });

    it('should handle path with multiple leading slashes', () => {
      const url = (scraper as any).buildUrl('///test');
      expect(url).toBe('https://htreviews.org/test');
    });

    it('should handle base URL with trailing slash', () => {
      const customScraper = new Scraper({ baseURL: 'https://example.com/' });
      const url = (customScraper as any).buildUrl('/test');
      expect(url).toBe('https://example.com/test');
    });

    it('should handle base URL with multiple trailing slashes', () => {
      const customScraper = new Scraper({ baseURL: 'https://example.com///' });
      const url = (customScraper as any).buildUrl('/test');
      expect(url).toBe('https://example.com/test');
    });

    it('should handle nested paths', () => {
      const url = (scraper as any).buildUrl('/api/v1/tobaccos/brands');
      expect(url).toBe('https://htreviews.org/api/v1/tobaccos/brands');
    });

    it('should handle empty path', () => {
      const url = (scraper as any).buildUrl('');
      expect(url).toBe('https://htreviews.org');
    });

    it('should handle path with query parameters', () => {
      const url = (scraper as any).buildUrl('/test?page=1&limit=10');
      expect(url).toBe('https://htreviews.org/test?page=1&limit=10');
    });
  });

  describe('elementExists', () => {
    it('should return true when element exists', () => {
      const $ = cheerio.load('<html><body><div class="test">Content</div></body></html>');
      const exists = (scraper as any).elementExists($, '.test');
      expect(exists).toBe(true);
    });

    it('should return false when element does not exist', () => {
      const $ = cheerio.load('<html><body><div class="test">Content</div></body></html>');
      const exists = (scraper as any).elementExists($, '.nonexistent');
      expect(exists).toBe(false);
    });

    it('should handle multiple elements', () => {
      const $ = cheerio.load('<html><body><div class="item">1</div><div class="item">2</div></body></html>');
      const exists = (scraper as any).elementExists($, '.item');
      expect(exists).toBe(true);
    });

    it('should handle empty document', () => {
      const $ = cheerio.load('');
      const exists = (scraper as any).elementExists($, '.test');
      expect(exists).toBe(false);
    });
  });

  describe('extractTextSafe', () => {
    it('should extract text from existing element', () => {
      const $ = cheerio.load('<html><body><div class="test">Test Content</div></body></html>');
      const text = (scraper as any).extractTextSafe($, '.test');
      expect(text).toBe('Test Content');
    });

    it('should return default value when element does not exist', () => {
      const $ = cheerio.load('<html><body><div class="test">Test Content</div></body></html>');
      const text = (scraper as any).extractTextSafe($, '.nonexistent', 'default');
      expect(text).toBe('default');
    });

    it('should return empty string as default when element does not exist', () => {
      const $ = cheerio.load('<html><body><div class="test">Test Content</div></body></html>');
      const text = (scraper as any).extractTextSafe($, '.nonexistent');
      expect(text).toBe('');
    });

    it('should trim whitespace from extracted text', () => {
      const $ = cheerio.load('<html><body><div class="test">  Test Content  </div></body></html>');
      const text = (scraper as any).extractTextSafe($, '.test');
      expect(text).toBe('Test Content');
    });

    it('should handle empty text content', () => {
      const $ = cheerio.load('<html><body><div class="test"></div></body></html>');
      const text = (scraper as any).extractTextSafe($, '.test', 'default');
      expect(text).toBe('default');
    });

    it('should handle whitespace-only text content', () => {
      const $ = cheerio.load('<html><body><div class="test">   </div></body></html>');
      const text = (scraper as any).extractTextSafe($, '.test', 'default');
      expect(text).toBe('default');
    });

    it('should extract text from first matching element', () => {
      const $ = cheerio.load('<html><body><div class="test">First</div><div class="test">Second</div></body></html>');
      const text = (scraper as any).extractTextSafe($, '.test');
      expect(text).toBe('First');
    });

    it('should handle nested elements', () => {
      const $ = cheerio.load('<html><body><div class="test"><span>Nested</span> Text</div></body></html>');
      const text = (scraper as any).extractTextSafe($, '.test');
      expect(text).toBe('Nested Text');
    });
  });

  describe('extractAttributeSafe', () => {
    it('should extract attribute from existing element', () => {
      const $ = cheerio.load('<html><body><a class="test" href="https://example.com">Link</a></body></html>');
      const attr = (scraper as any).extractAttributeSafe($, '.test', 'href');
      expect(attr).toBe('https://example.com');
    });

    it('should return null when element does not exist', () => {
      const $ = cheerio.load('<html><body><a class="test" href="https://example.com">Link</a></body></html>');
      const attr = (scraper as any).extractAttributeSafe($, '.nonexistent', 'href');
      expect(attr).toBeNull();
    });

    it('should return default value when element does not exist', () => {
      const $ = cheerio.load('<html><body><a class="test" href="https://example.com">Link</a></body></html>');
      const attr = (scraper as any).extractAttributeSafe($, '.nonexistent', 'href', 'default');
      expect(attr).toBe('default');
    });

    it('should return null when attribute does not exist', () => {
      const $ = cheerio.load('<html><body><a class="test">Link</a></body></html>');
      const attr = (scraper as any).extractAttributeSafe($, '.test', 'href');
      expect(attr).toBeNull();
    });

    it('should return default value when attribute does not exist', () => {
      const $ = cheerio.load('<html><body><a class="test">Link</a></body></html>');
      const attr = (scraper as any).extractAttributeSafe($, '.test', 'href', 'default');
      expect(attr).toBe('default');
    });

    it('should extract attribute from first matching element', () => {
      const $ = cheerio.load('<html><body><a class="test" href="first">Link 1</a><a class="test" href="second">Link 2</a></body></html>');
      const attr = (scraper as any).extractAttributeSafe($, '.test', 'href');
      expect(attr).toBe('first');
    });

    it('should handle empty attribute value', () => {
      const $ = cheerio.load('<html><body><a class="test" href="">Link</a></body></html>');
      const attr = (scraper as any).extractAttributeSafe($, '.test', 'href');
      expect(attr).toBe('');
    });

    it('should handle data attributes', () => {
      const $ = cheerio.load('<html><body><div class="test" data-id="123">Content</div></body></html>');
      const attr = (scraper as any).extractAttributeSafe($, '.test', 'data-id');
      expect(attr).toBe('123');
    });
  });

  describe('extractNumberSafe', () => {
    it('should extract number from text', () => {
      const $ = cheerio.load('<html><body><div class="test">42</div></body></html>');
      const num = (scraper as any).extractNumberSafe($, '.test');
      expect(num).toBe(42);
    });

    it('should extract decimal number', () => {
      const $ = cheerio.load('<html><body><div class="test">3.14</div></body></html>');
      const num = (scraper as any).extractNumberSafe($, '.test');
      expect(num).toBe(3.14);
    });

    it('should extract negative number', () => {
      const $ = cheerio.load('<html><body><div class="test">-10</div></body></html>');
      const num = (scraper as any).extractNumberSafe($, '.test');
      expect(num).toBe(-10);
    });

    it('should extract number from text with non-numeric characters', () => {
      const $ = cheerio.load('<html><body><div class="test">Rating: 4.5 stars</div></body></html>');
      const num = (scraper as any).extractNumberSafe($, '.test');
      expect(num).toBe(4.5);
    });

    it('should extract number with commas', () => {
      const $ = cheerio.load('<html><body><div class="test">1,234</div></body></html>');
      const num = (scraper as any).extractNumberSafe($, '.test');
      expect(num).toBe(1234);
    });

    it('should return null when element does not exist', () => {
      const $ = cheerio.load('<html><body><div class="test">42</div></body></html>');
      const num = (scraper as any).extractNumberSafe($, '.nonexistent');
      expect(num).toBeNull();
    });

    it('should return default value when element does not exist', () => {
      const $ = cheerio.load('<html><body><div class="test">42</div></body></html>');
      const num = (scraper as any).extractNumberSafe($, '.nonexistent', 0);
      expect(num).toBe(0);
    });

    it('should return null when text is empty', () => {
      const $ = cheerio.load('<html><body><div class="test"></div></body></html>');
      const num = (scraper as any).extractNumberSafe($, '.test');
      expect(num).toBeNull();
    });

    it('should return null when text contains no numbers', () => {
      const $ = cheerio.load('<html><body><div class="test">No numbers here</div></body></html>');
      const num = (scraper as any).extractNumberSafe($, '.test');
      expect(num).toBeNull();
    });

    it('should return default value when text contains no numbers', () => {
      const $ = cheerio.load('<html><body><div class="test">No numbers here</div></body></html>');
      const num = (scraper as any).extractNumberSafe($, '.test', 0);
      expect(num).toBe(0);
    });

    it('should handle percentage values', () => {
      const $ = cheerio.load('<html><body><div class="test">85%</div></body></html>');
      const num = (scraper as any).extractNumberSafe($, '.test');
      expect(num).toBe(85);
    });

    it('should handle currency values', () => {
      const $ = cheerio.load('<html><body><div class="test">$19.99</div></body></html>');
      const num = (scraper as any).extractNumberSafe($, '.test');
      expect(num).toBe(19.99);
    });
  });

  // ============================================================================
  // Utility Methods Tests
  // ============================================================================

  describe('getHttpClient', () => {
    it('should return HTTP client instance', () => {
      const client = scraper.getHttpClient();
      expect(client).toBeInstanceOf(HttpClient);
    });

    it('should return same instance on multiple calls', () => {
      const client1 = scraper.getHttpClient();
      const client2 = scraper.getHttpClient();
      expect(client1).toBe(client2);
    });
  });

  describe('resetRateLimiter', () => {
    it('should call resetRateLimiter on HTTP client', () => {
      scraper.resetRateLimiter();
      // Should not throw any errors
      expect(() => scraper.resetRateLimiter()).not.toThrow();
    });

    it('should be callable multiple times', () => {
      scraper.resetRateLimiter();
      scraper.resetRateLimiter();
      scraper.resetRateLimiter();
      // Should not throw any errors
      expect(() => scraper.resetRateLimiter()).not.toThrow();
    });
  });

  describe('getBaseURL', () => {
    it('should return base URL', () => {
      const url = scraper.getBaseURL();
      expect(url).toBe('https://htreviews.org');
    });

    it('should return same value on multiple calls', () => {
      const url1 = scraper.getBaseURL();
      const url2 = scraper.getBaseURL();
      expect(url1).toBe(url2);
    });
  });

  describe('setBaseURL', () => {
    it('should set a new base URL', () => {
      scraper.setBaseURL('https://new-url.com');
      expect(scraper.getBaseURL()).toBe('https://new-url.com');
    });

    it('should allow changing URL multiple times', () => {
      scraper.setBaseURL('https://url1.com');
      expect(scraper.getBaseURL()).toBe('https://url1.com');
      
      scraper.setBaseURL('https://url2.com');
      expect(scraper.getBaseURL()).toBe('https://url2.com');
      
      scraper.setBaseURL('https://url3.com');
      expect(scraper.getBaseURL()).toBe('https://url3.com');
    });

    it('should handle URLs with trailing slashes', () => {
      scraper.setBaseURL('https://example.com/');
      expect(scraper.getBaseURL()).toBe('https://example.com/');
    });

    it('should handle URLs without trailing slashes', () => {
      scraper.setBaseURL('https://example.com');
      expect(scraper.getBaseURL()).toBe('https://example.com');
    });
  });

  // ============================================================================
  // ScrapeError Tests
  // ============================================================================

  describe('ScrapeError', () => {
    it('should create ScrapeError with message', () => {
      const error = new ScrapeError('Test error message');
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('ScrapeError');
    });

    it('should create ScrapeError with URL', () => {
      const error = new ScrapeError('Test error', 'https://example.com');
      expect(error.url).toBe('https://example.com');
    });

    it('should create ScrapeError with original error', () => {
      const originalError = new Error('Original error');
      const error = new ScrapeError('Test error', 'https://example.com', originalError);
      expect(error.originalError).toBe(originalError);
    });

    it('should extend Error properly', () => {
      const error = new ScrapeError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ScrapeError);
    });

    it('should have correct error name', () => {
      const error = new ScrapeError('Test error');
      expect(error.name).toBe('ScrapeError');
    });

    it('should have stack trace', () => {
      const error = new ScrapeError('Test error');
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should handle all parameters', () => {
      const originalError = new Error('Original');
      const error = new ScrapeError('Message', 'https://test.com', originalError);
      expect(error.message).toBe('Message');
      expect(error.url).toBe('https://test.com');
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe('ScrapeError');
    });

    it('should handle optional parameters', () => {
      const error1 = new ScrapeError('Message');
      expect(error1.url).toBeUndefined();
      expect(error1.originalError).toBeUndefined();

      const error2 = new ScrapeError('Message', 'https://test.com');
      expect(error2.url).toBe('https://test.com');
      expect(error2.originalError).toBeUndefined();
    });
  });

  // ============================================================================
  // Default Scraper Instance Tests
  // ============================================================================

  describe('Default Scraper Instance', () => {
    it('should export a default scraper instance', () => {
      const { scraper: defaultScraper } = require('@hookah-db/scraper');
      expect(defaultScraper).toBeDefined();
      expect(defaultScraper).toBeInstanceOf(Scraper);
    });

    it('should have default configuration', () => {
      const { scraper: defaultScraper } = require('@hookah-db/scraper');
      expect(defaultScraper.getBaseURL()).toBe('https://htreviews.org');
    });

    it('should be usable for scraping operations', async () => {
      const { scraper: defaultScraper } = require('@hookah-db/scraper');
      
      // Mock HTTP client for the default scraper
      const mockDefaultGet = jest.spyOn(defaultScraper.getHttpClient(), 'get')
        .mockResolvedValueOnce(createMockResponse('<html><body>Test</body></html>'));
      
      const html = await defaultScraper.fetchHtml('/test');
      expect(html).toBe('<html><body>Test</body></html>');
      
      mockDefaultGet.mockRestore();
    });

    it('should support all scraper methods', async () => {
      const { scraper: defaultScraper } = require('@hookah-db/scraper');
      
      const mockDefaultGet = jest.spyOn(defaultScraper.getHttpClient(), 'get')
        .mockResolvedValue(createMockResponse('<html><body>Test</body></html>'));
      
      // Test various methods
      await defaultScraper.fetchHtml('/test');
      await defaultScraper.fetchAndParse('/test');
      await defaultScraper.fetchHtmlWithResult('/test');
      await defaultScraper.fetchAndParseWithResult('/test');
      
      expect(mockDefaultGet).toHaveBeenCalledTimes(4);
      
      mockDefaultGet.mockRestore();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration Tests', () => {
    it('should handle complete scraping workflow', async () => {
      const testHtml = `
        <html>
          <body>
            <div class="brand">
              <h1 class="name">Sarma</h1>
              <p class="description">Russian tobacco brand</p>
              <img src="/images/sarma.jpg" alt="Sarma" class="image">
              <div class="rating">4.5</div>
            </div>
          </body>
        </html>
      `;
      
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));
      
      const result = await scraper.fetchAndParseWithResult('/brands/sarma');
      
      expect(result.url).toBe('https://htreviews.org/brands/sarma');
      expect(result.data('.name').text()).toBe('Sarma');
      expect(result.data('.description').text()).toBe('Russian tobacco brand');
      expect(result.data('.image').attr('src')).toBe('/images/sarma.jpg');
      expect(result.data('.rating').text()).toBe('4.5');
    });

    it('should handle multiple sequential requests', async () => {
      const html1 = '<html><body>Page 1</body></html>';
      const html2 = '<html><body>Page 2</body></html>';
      const html3 = '<html><body>Page 3</body></html>';
      
      mockGet
        .mockResolvedValueOnce(createMockResponse(html1))
        .mockResolvedValueOnce(createMockResponse(html2))
        .mockResolvedValueOnce(createMockResponse(html3));
      
      const result1 = await scraper.fetchHtml('/page1');
      const result2 = await scraper.fetchHtml('/page2');
      const result3 = await scraper.fetchHtml('/page3');
      
      expect(result1).toBe(html1);
      expect(result2).toBe(html2);
      expect(result3).toBe(html3);
      expect(mockGet).toHaveBeenCalledTimes(3);
    });

    it('should handle error recovery', async () => {
      const error = new Error('Network error');
      mockGet.mockRejectedValueOnce(error);
      
      await expect(scraper.fetchHtml('/test')).rejects.toThrow(ScrapeError);
      
      // Reset and try again
      mockGet.mockResolvedValueOnce(createMockResponse('<html><body>Success</body></html>'));
      const html = await scraper.fetchHtml('/test');
      expect(html).toBe('<html><body>Success</body></html>');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very long paths', async () => {
      const longPath = '/a'.repeat(100);
      const testHtml = '<html><body>Test</body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));
      
      const html = await scraper.fetchHtml(longPath);
      expect(html).toBe(testHtml);
      expect(mockGet).toHaveBeenCalledWith(longPath);
    });

    it('should handle special characters in paths', async () => {
      const specialPath = '/test?param=value&other=test#anchor';
      const testHtml = '<html><body>Test</body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(testHtml));
      
      const html = await scraper.fetchHtml(specialPath);
      expect(html).toBe(testHtml);
    });

    it('should handle unicode characters in HTML', async () => {
      const unicodeHtml = '<html><body>Тест 中文 🚀</body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(unicodeHtml));
      
      const html = await scraper.fetchHtml('/test');
      expect(html).toBe(unicodeHtml);
    });

    it('should handle malformed HTML', async () => {
      const malformedHtml = '<div><p>Unclosed';
      mockGet.mockResolvedValueOnce(createMockResponse(malformedHtml));
      
      const $ = await scraper.fetchAndParse('/test');
      expect($('p').text()).toBe('Unclosed');
    });

    it('should handle HTML with script tags', async () => {
      const scriptHtml = '<html><body><script>alert("test");</script><div>Content</div></body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(scriptHtml));
      
      const html = await scraper.fetchHtml('/test');
      expect(html).toBe(scriptHtml);
    });

    it('should handle HTML with comments', async () => {
      const commentHtml = '<html><body><!-- Comment --><div>Content</div></body></html>';
      mockGet.mockResolvedValueOnce(createMockResponse(commentHtml));
      
      const $ = await scraper.fetchAndParse('/test');
      expect($('div').text()).toBe('Content');
    });
  });
});
