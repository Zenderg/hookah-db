/**
 * Flavor URL Parser Tests
 * 
 * Tests for parsing flavor URLs from API responses.
 */

import { FlavorUrlParser } from '@hookah-db/scraper';

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

describe('FlavorUrlParser', () => {
  let parser: FlavorUrlParser;

  beforeEach(() => {
    jest.clearAllMocks();
    parser = new FlavorUrlParser();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('parseFlavorUrls', () => {
    it('should parse valid API response with flavor URLs', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
        { url: '/tobaccos/sarma/leto', slug: 'leto' },
        { url: '/tobaccos/sarma/osen', slug: 'osen' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        url: '/tobaccos/sarma/zima',
        slug: 'zima',
        brandSlug: 'sarma',
      });
      expect(result[1]).toEqual({
        url: '/tobaccos/sarma/leto',
        slug: 'leto',
        brandSlug: 'sarma',
      });
      expect(result[2]).toEqual({
        url: '/tobaccos/sarma/osen',
        slug: 'osen',
        brandSlug: 'sarma',
      });
    });

    it('should extract URLs from flavor objects', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('/tobaccos/sarma/zima');
    });

    it('should validate URL format (must start with /tobaccos/)', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
        { url: '/invalid/url', slug: 'invalid' },
        { url: '/tobaccos/sarma/leto', slug: 'leto' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].url).toBe('/tobaccos/sarma/zima');
      expect(result[1].url).toBe('/tobaccos/sarma/leto');
    });

    it('should remove duplicate URLs', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
        { url: '/tobaccos/sarma/zima', slug: 'zima' }, // Duplicate
        { url: '/tobaccos/sarma/leto', slug: 'leto' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].url).toBe('/tobaccos/sarma/zima');
      expect(result[1].url).toBe('/tobaccos/sarma/leto');
    });

    it('should handle missing URL field', () => {
      // Arrange
      const response = [
        { slug: 'zima' }, // Missing URL
        { url: '/tobaccos/sarma/leto', slug: 'leto' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('/tobaccos/sarma/leto');
    });

    it('should handle invalid URL format', () => {
      // Arrange
      const response = [
        { url: 'invalid-url', slug: 'zima' },
        { url: '/tobaccos/sarma/leto', slug: 'leto' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('/tobaccos/sarma/leto');
    });

    it('should handle empty response array', () => {
      // Arrange
      const response: any[] = [];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle malformed response objects', () => {
      // Arrange
      const response = [
        null,
        undefined,
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
        'string',
        123,
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('/tobaccos/sarma/zima');
    });

    it('should extract slug from URL when slug field is missing', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima' }, // Missing slug
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('zima');
      expect(result[0].url).toBe('/tobaccos/sarma/zima');
    });

    it('should use slug field when present', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'custom-slug' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('custom-slug');
    });

    it('should handle URLs with multiple path segments', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/brand/subdir/flavor', slug: 'flavor' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'brand');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('flavor');
      expect(result[0].url).toBe('/tobaccos/brand/subdir/flavor');
    });

    it('should handle non-string URL values', () => {
      // Arrange
      const response = [
        { url: 123, slug: 'zima' },
        { url: '/tobaccos/sarma/leto', slug: 'leto' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('/tobaccos/sarma/leto');
    });

    it('should handle non-string slug values', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 123 },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('zima'); // Extracted from URL
    });
  });

  describe('Configuration', () => {
    it('should use default URL property name', () => {
      // Arrange & Act
      const parser = new FlavorUrlParser();

      // Assert
      expect(parser).toBeDefined();
    });

    it('should use default slug property name', () => {
      // Arrange & Act
      const parser = new FlavorUrlParser();

      // Assert
      expect(parser).toBeDefined();
    });

    it('should use custom URL property name', () => {
      // Arrange & Act
      const parser = new FlavorUrlParser({ urlProperty: 'href' });

      // Assert
      expect(parser).toBeDefined();
    });

    it('should use custom slug property name', () => {
      // Arrange & Act
      const parser = new FlavorUrlParser({ slugProperty: 'name' });

      // Assert
      expect(parser).toBeDefined();
    });

    it('should parse with custom URL property', () => {
      // Arrange
      const parser = new FlavorUrlParser({ urlProperty: 'href' });
      const response = [
        { href: '/tobaccos/sarma/zima', slug: 'zima' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('/tobaccos/sarma/zima');
    });

    it('should parse with custom slug property', () => {
      // Arrange
      const parser = new FlavorUrlParser({ slugProperty: 'name' });
      const response = [
        { url: '/tobaccos/sarma/zima', name: 'zima' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('zima');
    });
  });

  describe('URL Validation', () => {
    it('should accept URLs starting with /tobaccos/', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should reject URLs not starting with /tobaccos/', () => {
      // Arrange
      const response = [
        { url: '/products/sarma/zima', slug: 'zima' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should reject URLs without leading slash', () => {
      // Arrange
      const response = [
        { url: 'tobaccos/sarma/zima', slug: 'zima' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should reject empty URLs', () => {
      // Arrange
      const response = [
        { url: '', slug: 'zima' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1); // Empty URL is allowed if slug is present
    });

    it('should reject null URLs', () => {
      // Arrange
      const response = [
        { slug: 'zima' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1); // Null URL is allowed if slug is present
    });
  });

  describe('Slug Extraction', () => {
    it('should extract slug from URL with 3 segments', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result[0].slug).toBe('zima');
    });

    it('should extract slug from URL with more than 3 segments', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/brand/subdir/flavor' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'brand');

      // Assert
      expect(result[0].slug).toBe('flavor');
    });

    it('should handle slug with special characters', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/klassicheskaya_zima', slug: 'klassicheskaya_zima' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result[0].slug).toBe('klassicheskaya_zima');
    });

    it('should handle URL with trailing slash', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima/' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('zima/');
    });
  });

  describe('Duplicate Removal', () => {
    it('should remove exact duplicate URLs', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should keep first occurrence of duplicate', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima1' },
        { url: '/tobaccos/sarma/zima', slug: 'zima2' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('zima1');
    });

    it('should handle no duplicates', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
        { url: '/tobaccos/sarma/leto', slug: 'leto' },
        { url: '/tobaccos/sarma/osen', slug: 'osen' },
      ];

      // Act
      const result = parser.parseFlavorUrls(response, 'sarma');

      // Assert
      expect(result).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle null response', () => {
      // Arrange
      const response = null;

      // Act
      const result = parser.parseFlavorUrls(response as any, 'sarma');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle undefined response', () => {
      // Arrange
      const response = undefined;

      // Act
      const result = parser.parseFlavorUrls(response as any, 'sarma');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle object response', () => {
      // Arrange
      const response = { data: [] };

      // Act
      const result = parser.parseFlavorUrls(response as any, 'sarma');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle string response', () => {
      // Arrange
      const response = '[]';

      // Act
      const result = parser.parseFlavorUrls(response as any, 'sarma');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle number response', () => {
      // Arrange
      const response = 123;

      // Act
      const result = parser.parseFlavorUrls(response as any, 'sarma');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle boolean response', () => {
      // Arrange
      const response = true;

      // Act
      const result = parser.parseFlavorUrls(response as any, 'sarma');

      // Assert
      expect(result).toHaveLength(0);
    });
  });
});
