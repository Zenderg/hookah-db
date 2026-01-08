/**
 * Unit tests for Flavor URL Parser
 * 
 * Tests for parsing flavor URLs from API response including:
 * - Valid URL parsing
 * - URL validation
 * - Duplicate removal
 * - Error handling
 */

import { FlavorUrlParser, FlavorUrlParseResult } from '../../src/scraper';

// ============================================================================
// Test Suite
// ============================================================================

describe('Flavor URL Parser', () => {
  let parser: FlavorUrlParser;

  beforeEach(() => {
    parser = new FlavorUrlParser();
  });

  // ============================================================================
  // Tests for parseFlavorUrls method
  // ============================================================================

  describe('parseFlavorUrls', () => {
    it('should parse valid flavor URLs from API response', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima', name: 'Зима' },
          { slug: 'sarma/klassicheskaya/vesna', name: 'Весна' },
          { slug: 'sarma/klassicheskaya/leto', name: 'Лето' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(3);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/zima');
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/vesna');
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/leto');
    });

    it('should prepend brandSlug to flavor URLs', () => {
      const apiResponse = {
        data: [
          { slug: 'klassicheskaya/zima', name: 'Зима' },
          { slug: 'klassicheskaya/vesna', name: 'Весна' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/zima');
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/vesna');
    });

    it('should handle empty API response', () => {
      const apiResponse = { data: [] };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(0);
    });

    it('should handle missing data field', () => {
      const apiResponse = {} as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should handle null API response', () => {
      const apiResponse = null as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should handle undefined API response', () => {
      const apiResponse = undefined as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should remove duplicate flavor URLs', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima', name: 'Зима' },
          { slug: 'sarma/klassicheskaya/zima', name: 'Зима' },
          { slug: 'sarma/klassicheskaya/vesna', name: 'Весна' },
          { slug: 'sarma/klassicheskaya/vesna', name: 'Весна' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(2);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/zima');
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/vesna');
    });

    it('should handle API response with missing slug field', () => {
      const apiResponse = {
        data: [
          { name: 'Зима' },
          { slug: 'sarma/klassicheskaya/vesna', name: 'Весна' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(1);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/vesna');
    });

    it('should handle API response with empty slug', () => {
      const apiResponse = {
        data: [
          { slug: '', name: 'Зима' },
          { slug: 'sarma/klassicheskaya/vesna', name: 'Весна' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(1);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/vesna');
    });

    it('should handle API response with null slug', () => {
      const apiResponse = {
        data: [
          { slug: null as any, name: 'Зима' },
          { slug: 'sarma/klassicheskaya/vesna', name: 'Весна' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(1);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/vesna');
    });

    it('should handle API response with undefined slug', () => {
      const apiResponse = {
        data: [
          { slug: undefined as any, name: 'Зима' },
          { slug: 'sarma/klassicheskaya/vesna', name: 'Весна' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(1);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/vesna');
    });

    it('should handle API response with non-string slug', () => {
      const apiResponse = {
        data: [
          { slug: 123 as any, name: 'Зима' },
          { slug: 'sarma/klassicheskaya/vesna', name: 'Весна' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(1);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/vesna');
    });

    it('should handle API response with special characters in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/зима', name: 'Зима' },
          { slug: 'sarma/klassicheskaya/весна', name: 'Весна' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(2);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/зима');
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/весна');
    });

    it('should handle API response with numbers in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/limited-edition/2024', name: '2024 Edition' },
          { slug: 'sarma/limited-edition/2025', name: '2025 Edition' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(2);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/limited-edition/2024');
      expect(result.flavorUrls).toContain('/tobaccos/sarma/limited-edition/2025');
    });

    it('should handle API response with hyphens in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima-2024', name: 'Зима 2024' },
          { slug: 'sarma/klassicheskaya/vesna-2024', name: 'Весна 2024' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(2);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/zima-2024');
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/vesna-2024');
    });

    it('should handle API response with underscores in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima_2024', name: 'Зима 2024' },
          { slug: 'sarma/klassicheskaya/vesna_2024', name: 'Весна 2024' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(2);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/zima_2024');
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/vesna_2024');
    });

    it('should handle API response with multiple path segments', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/limited/edition/winter/2024', name: 'Зима 2024' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(1);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/limited/edition/winter/2024');
    });

    it('should handle API response with single segment slug', () => {
      const apiResponse = {
        data: [
          { slug: 'zima', name: 'Зима' },
          { slug: 'vesna', name: 'Весна' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(2);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/zima');
      expect(result.flavorUrls).toContain('/tobaccos/sarma/vesna');
    });

    it('should handle API response with duplicate slugs', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima', name: 'Зима' },
          { slug: 'sarma/klassicheskaya/zima', name: 'Зима (Duplicate)' },
          { slug: 'sarma/klassicheskaya/vesna', name: 'Весна' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(2);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/zima');
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/vesna');
    });

    it('should handle API response with mixed valid and invalid slugs', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima', name: 'Зима' },
          { slug: '', name: 'Empty' },
          { slug: null as any, name: 'Null' },
          { slug: undefined as any, name: 'Undefined' },
          { slug: 'sarma/klassicheskaya/vesna', name: 'Весна' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(2);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/zima');
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/vesna');
    });

    it('should handle large API response', () => {
      const flavors = [];
      for (let i = 1; i <= 100; i++) {
        flavors.push({ slug: `sarma/klassicheskaya/flavor-${i}`, name: `Flavor ${i}` });
      }

      const apiResponse = { data: flavors };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(100);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/flavor-1');
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/flavor-50');
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/flavor-100');
    });

    it('should preserve URL format', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls[0]).toBe('/tobaccos/sarma/klassicheskaya/zima');
      expect(result.flavorUrls[0]).toMatch(/^\/tobaccos\//);
    });
  });

  // ============================================================================
  // Tests for brandSlug parameter
  // ============================================================================

  describe('brandSlug Parameter', () => {
    it('should use provided brandSlug', () => {
      const apiResponse = {
        data: [
          { slug: 'klassicheskaya/zima', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'dogma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/dogma/klassicheskaya/zima');
    });

    it('should handle empty brandSlug', () => {
      const apiResponse = {
        data: [
          { slug: 'klassicheskaya/zima', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, '');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/klassicheskaya/zima');
    });

    it('should handle null brandSlug', () => {
      const apiResponse = {
        data: [
          { slug: 'klassicheskaya/zima', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, null as any);

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/klassicheskaya/zima');
    });

    it('should handle undefined brandSlug', () => {
      const apiResponse = {
        data: [
          { slug: 'klassicheskaya/zima', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, undefined as any);

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/klassicheskaya/zima');
    });

    it('should handle brandSlug with special characters', () => {
      const apiResponse = {
        data: [
          { slug: 'klassicheskaya/zima', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'тестовый-бренд');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/тестовый-бренд/klassicheskaya/zima');
    });

    it('should handle brandSlug with hyphens', () => {
      const apiResponse = {
        data: [
          { slug: 'klassicheskaya/zima', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'test-brand');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/test-brand/klassicheskaya/zima');
    });

    it('should handle brandSlug with numbers', () => {
      const apiResponse = {
        data: [
          { slug: 'klassicheskaya/zima', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'brand123');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/brand123/klassicheskaya/zima');
    });
  });

  // ============================================================================
  // Tests for error handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should return error result for invalid API response', () => {
      const apiResponse = { invalid: 'data' } as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid API response');
    });

    it('should return error result for null API response', () => {
      const apiResponse = null as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should return error result for undefined API response', () => {
      const apiResponse = undefined as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should return error result for non-object API response', () => {
      const apiResponse = 'invalid' as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should return error result for array API response', () => {
      const apiResponse = [] as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should return error result for number API response', () => {
      const apiResponse = 123 as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should return error result for boolean API response', () => {
      const apiResponse = true as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should handle API response with non-array data field', () => {
      const apiResponse = { data: 'invalid' } as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should handle API response with null data field', () => {
      const apiResponse = { data: null } as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should handle API response with undefined data field', () => {
      const apiResponse = { data: undefined } as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should handle API response with object data field', () => {
      const apiResponse = { data: { invalid: 'object' } } as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should handle API response with number data field', () => {
      const apiResponse = { data: 123 } as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should handle API response with boolean data field', () => {
      const apiResponse = { data: true } as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeDefined();
    });
  });

  // ============================================================================
  // Tests for result object
  // ============================================================================

  describe('Result Object', () => {
    it('should return success result for valid API response', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toBeDefined();
      expect(Array.isArray(result.flavorUrls)).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error result for invalid API response', () => {
      const apiResponse = null as any;

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(false);
      expect(result.flavorUrls).toBeDefined();
      expect(Array.isArray(result.flavorUrls)).toBe(true);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should return empty array for empty API response', () => {
      const apiResponse = { data: [] };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(0);
      expect(result.error).toBeUndefined();
    });

    it('should return unique URLs', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima', name: 'Зима' },
          { slug: 'sarma/klassicheskaya/zima', name: 'Зима' },
          { slug: 'sarma/klassicheskaya/zima', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(1);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/zima');
    });
  });

  // ============================================================================
  // Tests for edge cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle API response with whitespace in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima ', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/zima ');
    });

    it('should handle API response with URL-encoded slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/%D0%B7%D0%B8%D0%BC%D0%B0', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/klassicheskaya/%D0%B7%D0%B8%D0%BC%D0%B0');
    });

    it('should handle API response with mixed case slug', () => {
      const apiResponse = {
        data: [
          { slug: 'Sarma/Klassicheskaya/Zima', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/Sarma/Klassicheskaya/Zima');
    });

    it('should handle API response with trailing slash in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima/', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/sarma/klassicheskaya/zima/');
    });

    it('should handle API response with leading slash in slug', () => {
      const apiResponse = {
        data: [
          { slug: '/sarma/klassicheskaya/zima', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma//sarma/klassicheskaya/zima');
    });

    it('should handle API response with consecutive slashes in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma//klassicheskaya//zima', name: 'Зима' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/sarma//klassicheskaya//zima');
    });

    it('should handle API response with dots in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima.v2', name: 'Зима v2' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/sarma/klassicheskaya/zima.v2');
    });

    it('should handle API response with plus signs in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima+2024', name: 'Зима + 2024' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/sarma/klassicheskaya/zima+2024');
    });

    it('should handle API response with at signs in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima@2024', name: 'Зима @ 2024' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/sarma/klassicheskaya/zima@2024');
    });

    it('should handle API response with hash signs in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima#2024', name: 'Зима # 2024' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/sarma/klassicheskaya/zima#2024');
    });

    it('should handle API response with question marks in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima?2024', name: 'Зима ? 2024' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/sarma/klassicheskaya/zima?2024');
    });

    it('should handle API response with ampersands in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima&vesna', name: 'Зима & Весна' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/sarma/klassicheskaya/zima&vesna');
    });

    it('should handle API response with equals signs in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima=2024', name: 'Зима = 2024' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/sarma/klassicheskaya/zima=2024');
    });

    it('should handle API response with percent signs in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima%2024', name: 'Зима % 2024' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/sarma/klassicheskaya/zima%2024');
    });

    it('should handle API response with very long slug', () => {
      const longSlug = 'sarma/klassicheskaya/' + 'a'.repeat(1000);
      const apiResponse = {
        data: [
          { slug: longSlug, name: 'Very Long Flavor Name' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toHaveLength(1);
      expect(result.flavorUrls[0]).toContain('/tobaccos/sarma/sarma/klassicheskaya/');
    });

    it('should handle API response with single character slug', () => {
      const apiResponse = {
        data: [
          { slug: 'a', name: 'A' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/a');
    });

    it('should handle API response with emoji in slug', () => {
      const apiResponse = {
        data: [
          { slug: 'sarma/klassicheskaya/zima❄️', name: 'Зима ❄️' },
        ],
      };

      const result = parser.parseFlavorUrls(apiResponse, 'sarma');

      expect(result.success).toBe(true);
      expect(result.flavorUrls).toContain('/tobaccos/sarma/sarma/klassicheskaya/zima❄️');
    });
  });
});
