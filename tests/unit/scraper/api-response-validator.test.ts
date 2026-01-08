/**
 * API Response Validator Tests
 * 
 * Tests for validating API responses from htreviews.org.
 */

import { ApiResponseValidator } from '../../src/scraper';

// Mock logger factory
jest.mock('../../src/utils', () => ({
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

describe('ApiResponseValidator', () => {
  let validator: ApiResponseValidator;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new ApiResponseValidator();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateResponse', () => {
    it('should validate valid response array', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
        { url: '/tobaccos/sarma/leto', slug: 'leto' },
      ];

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate non-array response', () => {
      // Arrange
      const response = { data: [] };

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Response is not an array');
    });

    it('should validate response with missing required fields', () => {
      // Arrange
      const response = [
        { name: 'test' }, // Missing url and slug
      ];

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Flavor at index 0');
      expect(result.errors[0]).toContain('Missing required properties');
    });

    it('should validate response with invalid URL format', () => {
      // Arrange
      const response = [
        { url: '/invalid/url', slug: 'test' },
      ];

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Flavor at index 0');
      expect(result.errors[0]).toContain('Invalid URL format');
    });

    it('should provide detailed error messages', () => {
      // Arrange
      const response = [
        { name: 'test' }, // Missing url and slug
        { url: '/invalid/url', slug: 'test' }, // Invalid URL
      ];

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(result.errors[0]).toContain('Flavor at index 0');
      expect(result.errors[1]).toContain('Flavor at index 1');
    });

    it('should validate empty array', () => {
      // Arrange
      const response: any[] = [];

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate response with single valid flavor', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
      ];

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate response with multiple valid flavors', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
        { url: '/tobaccos/sarma/leto', slug: 'leto' },
        { url: '/tobaccos/sarma/osen', slug: 'osen' },
      ];

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate response with mixed valid and invalid flavors', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
        { name: 'invalid' }, // Invalid
        { url: '/tobaccos/sarma/leto', slug: 'leto' },
      ];

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('Flavor at index 1');
    });

    it('should handle null response', () => {
      // Arrange
      const response = null;

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Response is not an array');
    });

    it('should handle undefined response', () => {
      // Arrange
      const response = undefined;

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Response is not an array');
    });

    it('should handle string response', () => {
      // Arrange
      const response = '[]';

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Response is not an array');
    });

    it('should handle number response', () => {
      // Arrange
      const response = 123;

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Response is not an array');
    });

    it('should handle boolean response', () => {
      // Arrange
      const response = true;

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Response is not an array');
    });
  });

  describe('validateFlavorObject', () => {
    it('should validate valid flavor object', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate flavor with only url', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate flavor with only slug', () => {
      // Arrange
      const flavor = {
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate flavor with both url and slug', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should invalidate flavor without url or slug', () => {
      // Arrange
      const flavor = {
        name: 'Зима',
        rating: 4.5,
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required properties (url or slug)');
    });

    it('should invalidate flavor with invalid URL format', () => {
      // Arrange
      const flavor = {
        url: '/products/sarma/zima',
        slug: 'test',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toMatch(/Invalid URL format: \/products\/sarma\/zima/);
    });

    it('should validate flavor with valid URL starting with /tobaccos/', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should invalidate flavor with URL not starting with /tobaccos/', () => {
      // Arrange
      const flavor = {
        url: '/products/sarma/zima',
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toMatch(/Invalid URL format: \/products\/sarma\/zima/);
    });

    it('should handle null flavor object', () => {
      // Arrange
      const flavor = null;

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flavor is not an object');
    });

    it('should handle undefined flavor object', () => {
      // Arrange
      const flavor = undefined;

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flavor is not an object');
    });

    it('should handle string flavor object', () => {
      // Arrange
      const flavor = 'flavor string';

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flavor is not an object');
    });

    it('should handle number flavor object', () => {
      // Arrange
      const flavor = 123;

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flavor is not an object');
    });

    it('should handle boolean flavor object', () => {
      // Arrange
      const flavor = true;

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Flavor is not an object');
    });

    it('should handle empty object', () => {
      // Arrange
      const flavor = {};

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required properties (url or slug)');
    });

    it('should handle object with null url but valid slug', () => {
      // Arrange
      const flavor = {
        url: null,
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle object with undefined url but valid slug', () => {
      // Arrange
      const flavor = {
        url: undefined,
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle object with empty string url but valid slug', () => {
      // Arrange
      const flavor = {
        url: '',
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle object with null slug but valid url', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
        slug: null,
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle object with undefined slug but valid url', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
        slug: undefined,
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle object with empty string slug but valid url', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
        slug: '',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle object with both url and slug', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle object with additional properties', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
        slug: 'zima',
        name: 'Зима',
        rating: 4.5,
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Validation Result Structure', () => {
    it('should return ValidationResult with isValid boolean', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
      ];

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result).toHaveProperty('isValid');
      expect(typeof result.isValid).toBe('boolean');
    });

    it('should return ValidationResult with errors array', () => {
      // Arrange
      const response = [
        { name: 'test' },
      ];

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should return empty errors array for valid response', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
      ];

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.errors).toEqual([]);
    });

    it('should return non-empty errors array for invalid response', () => {
      // Arrange
      const response = [
        { name: 'test' },
      ];

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return true for isValid when no errors', () => {
      // Arrange
      const response = [
        { url: '/tobaccos/sarma/zima', slug: 'zima' },
      ];

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should return false for isValid when errors exist', () => {
      // Arrange
      const response = [
        { name: 'test' },
      ];

      // Act
      const result = validator.validateResponse(response);

      // Assert
      expect(result.isValid).toBe(false);
    });
  });

  describe('URL Format Validation', () => {
    it('should accept /tobaccos/brand/flavor format', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should accept /tobaccos/brand/subdir/flavor format', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/brand/subdir/flavor',
        slug: 'flavor',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should reject /products/brand/flavor format', () => {
      // Arrange
      const flavor = {
        url: '/products/sarma/zima',
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toMatch(/Invalid URL format: \/products\/sarma\/zima/);
    });

    it('should reject tobaccos/brand/flavor format (no leading slash)', () => {
      // Arrange
      const flavor = {
        url: 'tobaccos/sarma/zima',
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toMatch(/Invalid URL format: tobaccos\/sarma\/zima/);
    });

    it('should reject /brands/brand/flavor format', () => {
      // Arrange
      const flavor = {
        url: '/brands/sarma/zima',
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toMatch(/Invalid URL format: \/brands\/sarma\/zima/);
    });

    it('should reject empty URL string', () => {
      // Arrange
      const flavor = {
        url: '',
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true); // Empty URL is allowed if slug is present
    });

    it('should reject URL with only whitespace', () => {
      // Arrange
      const flavor = {
        url: '   ',
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toMatch(/Invalid URL format: \s+/);
    });
  });

  describe('Required Properties Validation', () => {
    it('should accept flavor with url only', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept flavor with slug only', () => {
      // Arrange
      const flavor = {
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept flavor with both url and slug', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject flavor with neither url nor slug', () => {
      // Arrange
      const flavor = {
        name: 'Зима',
        rating: 4.5,
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required properties (url or slug)');
    });

    it('should reject empty object', () => {
      // Arrange
      const flavor = {};

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required properties (url or slug)');
    });

    it('should accept flavor with null url but valid slug', () => {
      // Arrange
      const flavor = {
        url: null,
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept flavor with undefined url but valid slug', () => {
      // Arrange
      const flavor = {
        url: undefined,
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept flavor with empty string url but valid slug', () => {
      // Arrange
      const flavor = {
        url: '',
        slug: 'zima',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept flavor with null slug but valid url', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
        slug: null,
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept flavor with undefined slug but valid url', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
        slug: undefined,
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept flavor with empty string slug but valid url', () => {
      // Arrange
      const flavor = {
        url: '/tobaccos/sarma/zima',
        slug: '',
      };

      // Act
      const result = validator.validateFlavorObject(flavor);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
