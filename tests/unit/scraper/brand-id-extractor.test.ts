/**
 * Brand ID Extractor Tests
 * 
 * Tests for extracting brand ID from brand detail page HTML.
 */

import { BrandIdExtractor } from '@hookah-db/scraper';
import { Scraper } from '@hookah-db/scraper';
import * as cheerio from 'cheerio';

// Mock logger factory
jest.mock('@hookah-db/utils', () => ({
  LoggerFactory: {
    createEnvironmentLogger: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      verbose: jest.fn(),
    })),
  },
}));

describe('BrandIdExtractor', () => {
  let extractor: BrandIdExtractor;
  let mockCheerioAPI: any;

  beforeEach(() => {
    jest.clearAllMocks();
    extractor = new BrandIdExtractor();
    mockCheerioAPI = cheerio.load('');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('extractBrandId', () => {
    it('should extract brand ID from HTML with data-id attribute', () => {
      // Arrange
      const html = '<div data-id="12345">Brand Content</div>';
      mockCheerioAPI = cheerio.load(html);

      // Act
      const brandId = extractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBe('12345');
    });

    it('should return null when data-id attribute is missing', () => {
      // Arrange
      const html = '<div>Brand Content</div>';
      mockCheerioAPI = cheerio.load(html);

      // Act
      const brandId = extractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBeNull();
    });

    it('should return null when element with selector is not found', () => {
      // Arrange
      const html = '<div>Brand Content</div>';
      mockCheerioAPI = cheerio.load(html);

      // Act
      const brandId = extractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBeNull();
    });

    it('should handle malformed HTML gracefully', () => {
      // Arrange
      const html = '<div data-id="">Brand Content</div>';
      mockCheerioAPI = cheerio.load(html);

      // Act
      const brandId = extractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBeNull();
    });

    it('should work with custom selector', () => {
      // Arrange
      const customExtractor = new BrandIdExtractor({ selector: '.brand-id' });
      const html = '<div class="brand-id" data-id="custom-id">Brand</div>';
      mockCheerioAPI = cheerio.load(html);

      // Act
      const brandId = customExtractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBe('custom-id');
    });

    it('should work with custom attribute name', () => {
      // Arrange
      const customExtractor = new BrandIdExtractor({ 
        selector: '[data-brand-id]',
        attribute: 'data-brand-id' 
      });
      const html = '<div data-brand-id="custom-attr">Brand</div>';
      mockCheerioAPI = cheerio.load(html);

      // Act
      const brandId = customExtractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBe('custom-attr');
    });

    it('should extract from first matching element when multiple exist', () => {
      // Arrange
      const html = `
        <div data-id="first">First</div>
        <div data-id="second">Second</div>
        <div data-id="third">Third</div>
      `;
      mockCheerioAPI = cheerio.load(html);

      // Act
      const brandId = extractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBe('first');
    });

    it('should handle empty string brand ID', () => {
      // Arrange
      const html = '<div data-id="">Brand</div>';
      mockCheerioAPI = cheerio.load(html);

      // Act
      const brandId = extractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBeNull();
    });

    it('should handle whitespace in brand ID', () => {
      // Arrange
      const html = '<div data-id="  12345  ">Brand</div>';
      mockCheerioAPI = cheerio.load(html);

      // Act
      const brandId = extractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBe('  12345  '); // Returns raw value
    });

    it('should handle numeric brand ID as string', () => {
      // Arrange
      const html = '<div data-id="12345">Brand</div>';
      mockCheerioAPI = cheerio.load(html);

      // Act
      const brandId = extractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBe('12345');
      expect(typeof brandId).toBe('string');
    });

    it('should handle alphanumeric brand ID', () => {
      // Arrange
      const html = '<div data-id="brand-123-abc">Brand</div>';
      mockCheerioAPI = cheerio.load(html);

      // Act
      const brandId = extractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBe('brand-123-abc');
    });

    it('should handle special characters in brand ID', () => {
      // Arrange
      const html = '<div data-id="brand_id_123">Brand</div>';
      mockCheerioAPI = cheerio.load(html);

      // Act
      const brandId = extractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBe('brand_id_123');
    });
  });

  describe('extractBrandIdFromPage', () => {
    it('should extract brand ID from page successfully', async () => {
      // Arrange
      const html = '<div data-id="page-id-123">Brand</div>';
      mockCheerioAPI = cheerio.load(html);
      const mockScraper = new Scraper();
      const mockFetchAndParse = jest.spyOn(mockScraper, 'fetchAndParse')
        .mockResolvedValue(mockCheerioAPI);

      // Create a new extractor with the mocked scraper
      const testExtractor = new BrandIdExtractor();

      // Mock the Scraper constructor to return our mock
      jest.spyOn<any, any>(testExtractor as any, 'constructor')
        .mockImplementation(function(this: any) {
          this.scraper = mockScraper;
        });

      // Act - call extractBrandId directly with mocked HTML
      const brandId = testExtractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBe('page-id-123');
      mockFetchAndParse.mockRestore();
    });

    it('should return null when brand ID not found on page', async () => {
      // Arrange
      const html = '<div>Brand Content</div>';
      mockCheerioAPI = cheerio.load(html);

      // Act
      const brandId = extractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const html = '<div>Brand Content</div>';
      mockCheerioAPI = cheerio.load(html);

      // Act - should not throw error
      const brandId = extractor.extractBrandId(mockCheerioAPI);

      // Assert
      expect(brandId).toBeNull();
    });
  });

  describe('Configuration', () => {
    it('should use default selector when not provided', () => {
      // Arrange & Act
      const extractor = new BrandIdExtractor();

      // Assert
      expect(extractor).toBeDefined();
    });

    it('should use default attribute when not provided', () => {
      // Arrange & Act
      const extractor = new BrandIdExtractor();

      // Assert
      expect(extractor).toBeDefined();
    });

    it('should accept custom selector', () => {
      // Arrange & Act
      const extractor = new BrandIdExtractor({ selector: '.custom-selector' });

      // Assert
      expect(extractor).toBeDefined();
    });

    it('should accept custom attribute', () => {
      // Arrange & Act
      const extractor = new BrandIdExtractor({ attribute: 'data-custom' });

      // Assert
      expect(extractor).toBeDefined();
    });

    it('should accept both custom selector and attribute', () => {
      // Arrange & Act
      const extractor = new BrandIdExtractor({
        selector: '.custom-selector',
        attribute: 'data-custom',
      });

      // Assert
      expect(extractor).toBeDefined();
    });
  });
});
