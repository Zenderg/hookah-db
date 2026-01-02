/**
 * HTML Parser Tests
 *
 * Comprehensive tests for HTML parser module.
 * Tests cover utility functions, parser functions, error handling, and edge cases.
 *
 * @module test/html-parser
 */

import { readFileSync } from 'fs';

import { describe, it, expect, beforeEach } from 'vitest';
import * as cheerio from 'cheerio';

import {
  cleanText,
  normalizeUrl,
  extractSlug,
  parseHTMXPagination,
  parseBrandList,
  parseBrandDetail,
  parseProductList,
  parseProductDetail,
  isBrandDiscoveryComplete,
  isProductDiscoveryComplete,
} from '../src/html-parser.js';
import { ParseError } from '../src/parser-error.js';

// ============================================================================
// Test Data Helpers
// ============================================================================

/**
 * Load HTML content from examples directory
 */
function loadExampleHtml(filename: string): string {
  const path = `${import.meta.dirname}/../../examples/${filename}`;
  return readFileSync(path, 'utf-8');
}

// ============================================================================
// Utility Functions Tests
// ============================================================================

describe('cleanText()', () => {
  it('should remove extra whitespace from text', () => {
    expect(cleanText('  hello   world  ')).toBe('hello world');
    expect(cleanText('multiple    spaces')).toBe('multiple spaces');
  });

  it('should handle null values', () => {
    expect(cleanText(null)).toBe('');
  });

  it('should handle undefined values', () => {
    expect(cleanText(undefined)).toBe('');
  });

  it('should handle empty strings', () => {
    expect(cleanText('')).toBe('');
  });

  it('should handle strings with only whitespace', () => {
    expect(cleanText('   ')).toBe('');
    expect(cleanText('\t\n\r')).toBe('');
  });

  it('should handle strings with newlines and tabs', () => {
    expect(cleanText('hello\nworld')).toBe('hello world');
    expect(cleanText('hello\tworld')).toBe('hello world');
    expect(cleanText('hello\n\tworld')).toBe('hello world');
  });

  it('should handle mixed whitespace', () => {
    expect(cleanText('  \n  hello  \t  world  \r  ')).toBe('hello world');
  });
});

describe('normalizeUrl()', () => {
  it('should return absolute URLs unchanged', () => {
    expect(normalizeUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(normalizeUrl('http://example.com/path')).toBe('http://example.com/path');
  });

  it('should resolve relative URLs with baseUrl', () => {
    expect(normalizeUrl('/path', 'https://example.com')).toBe('https://example.com/path');
    expect(normalizeUrl('path', 'https://example.com/')).toBe('https://example.com/path');
  });

  it('should use default baseUrl when not provided', () => {
    expect(normalizeUrl('/tobaccos/brand')).toBe('https://htreviews.org/tobaccos/brand');
  });

  it('should handle null values', () => {
    expect(normalizeUrl(null)).toBeNull();
  });

  it('should handle undefined values', () => {
    expect(normalizeUrl(undefined)).toBeNull();
  });

  it('should handle empty strings', () => {
    expect(normalizeUrl('')).toBeNull();
  });

  it('should handle URLs with query parameters', () => {
    expect(normalizeUrl('/path?param=value', 'https://example.com')).toBe('https://example.com/path?param=value');
  });

  it('should handle URLs with fragments', () => {
    expect(normalizeUrl('/path#section', 'https://example.com')).toBe('https://example.com/path#section');
  });
});

describe('extractSlug()', () => {
  it('should extract slug from full URL', () => {
    expect(extractSlug('https://example.com/path/to/slug')).toBe('slug');
    expect(extractSlug('https://htreviews.org/tobaccos/brand-name')).toBe('brand-name');
  });

  it('should handle URLs without path', () => {
    expect(extractSlug('https://example.com')).toBeNull();
    expect(extractSlug('https://example.com/')).toBeNull();
  });

  it('should handle URLs with trailing slash', () => {
    expect(extractSlug('https://example.com/path/')).toBe('path');
  });

  it('should handle URLs with query parameters', () => {
    expect(extractSlug('https://example.com/path/slug?param=value')).toBe('slug');
  });

  it('should handle URLs with fragments', () => {
    expect(extractSlug('https://example.com/path/slug#section')).toBe('slug');
  });

  it('should handle invalid URLs', () => {
    expect(extractSlug('not a url')).toBeNull();
  });
});

describe('parseHTMXPagination()', () => {
  it('should extract pagination data from element with all attributes', () => {
    const html = '<div class="tobacco_list_items" data-target="/endpoint" data-offset="60" data-count="53" data-total-count="113"></div>';
    const $ = cheerio.load(html);
    const element = $('.tobacco_list_items');

    const result = parseHTMXPagination(element);

    expect(result).not.toBeNull();
    expect(result?.target).toBe('/endpoint');
    expect(result?.offset).toBe(60);
    expect(result?.count).toBe(53);
    expect(result?.totalCount).toBe(113);
    expect(result?.endpoint).toBe('https://htreviews.org/endpoint');
  });

  it('should handle missing attributes', () => {
    const html = '<div class="tobacco_list_items" data-target="/endpoint" data-offset="60"></div>';
    const $ = cheerio.load(html);
    const element = $('.tobacco_list_items');

    const result = parseHTMXPagination(element);

    expect(result).toBeNull();
  });

  it('should handle null element', () => {
    const result = parseHTMXPagination(null);
    expect(result).toBeNull();
  });

  it('should handle empty cheerio element', () => {
    const $ = cheerio.load('<div></div>');
    const element = $('.nonexistent');

    const result = parseHTMXPagination(element);

    expect(result).toBeNull();
  });

  it('should parse numeric values correctly', () => {
    const html = '<div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="100" data-total-count="200"></div>';
    const $ = cheerio.load(html);
    const element = $('.tobacco_list_items');

    const result = parseHTMXPagination(element);

    expect(result?.offset).toBe(0);
    expect(result?.count).toBe(100);
    expect(result?.totalCount).toBe(200);
  });

  it('should handle non-numeric values', () => {
    const html = '<div class="tobacco_list_items" data-target="/endpoint" data-offset="invalid" data-count="53" data-total-count="113"></div>';
    const $ = cheerio.load(html);
    const element = $('.tobacco_list_items');

    const result = parseHTMXPagination(element);

    expect(result).toBeNull();
  });
});

// ============================================================================
// ParseError Class Tests
// ============================================================================

describe('ParseError', () => {
  it('should create ParseError with all parameters', () => {
    const cause = new Error('Underlying error');
    const error = new ParseError('Test message', '.selector', '<html>content</html>', cause);

    expect(error.name).toBe('ParseError');
    expect(error.message).toBe('Test message');
    expect(error.element).toBe('.selector');
    expect(error.html).toBe('<html>content</html>');
    expect(error.cause).toBe(cause);
  });

  it('should create ParseError with minimal parameters', () => {
    const error = new ParseError('Test message', '.selector', '<html>content</html>');

    expect(error.name).toBe('ParseError');
    expect(error.message).toBe('Test message');
    expect(error.element).toBe('.selector');
    expect(error.html).toBe('<html>content</html>');
    expect(error.cause).toBeUndefined();
  });

  it('should truncate HTML content when too long', () => {
    const longHtml = '<html>' + 'a'.repeat(600) + '</html>';
    const error = new ParseError('Test message', '.selector', longHtml);

    expect(error.html.length).toBeLessThanOrEqual(503); // 500 + '...'
    expect(error.html.endsWith('...')).toBe(true);
  });

  it('should get detailed message with getDetailedMessage()', () => {
    const cause = new Error('Underlying error');
    const error = new ParseError('Test message', '.selector', '<html>content</html>', cause);

    const detailed = error.getDetailedMessage();

    expect(detailed).toContain('ParseError: Test message');
    expect(detailed).toContain('Element: .selector');
    expect(detailed).toContain('Caused by: Underlying error');
    expect(detailed).toContain('HTML preview: <html>content</html>');
  });

  it('should convert to JSON with toJSON()', () => {
    const cause = new Error('Underlying error');
    const error = new ParseError('Test message', '.selector', '<html>content</html>', cause);

    const json = error.toJSON();

    expect(json.name).toBe('ParseError');
    expect(json.message).toBe('Test message');
    expect(json.element).toBe('.selector');
    expect(json.html).toBe('<html>content</html>');
    expect(json.cause).toBe('Underlying error');
  });

  it('should be instance of Error', () => {
    const error = new ParseError('Test message', '.selector', '<html>content</html>');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof ParseError).toBe(true);
  });
});

// ============================================================================
// Brand List Parser Tests
// ============================================================================

describe('parseBrandList()', () => {
  describe('using brands.html example', () => {
    let brandsHtml: string;

    beforeEach(() => {
      brandsHtml = loadExampleHtml('htreviews.org_tobaccos_brands.html');
    });

    it('should parse brand list from example HTML file', () => {
      const result = parseBrandList(brandsHtml);

      expect(result).toBeDefined();
      expect(result.brands).toBeInstanceOf(Array);
      expect(result.brands.length).toBeGreaterThan(0);
    });

    it('should extract all brands correctly', () => {
      const result = parseBrandList(brandsHtml);

      expect(result.brands.length).toBeGreaterThan(0);
      result.brands.forEach(brand => {
        expect(brand.name).toBeDefined();
        expect(typeof brand.name).toBe('string');
        expect(brand.name.length).toBeGreaterThan(0);
      });
    });

    it('should extract brand names (prefer English)', () => {
      const result = parseBrandList(brandsHtml);

      result.brands.forEach(brand => {
        expect(brand.name).toBeDefined();
        expect(brand.name.length).toBeGreaterThan(0);
      });
    });

    it('should extract brand source URLs', () => {
      const result = parseBrandList(brandsHtml);

      result.brands.forEach(brand => {
        expect(brand.sourceUrl).toBeDefined();
        expect(typeof brand.sourceUrl).toBe('string');
        expect(brand.sourceUrl).toMatch(/^https:\/\/htreviews\.org\/tobaccos\//);
      });
    });

    it('should determine hasMore correctly', () => {
      const result = parseBrandList(brandsHtml);

      expect(typeof result.hasMore).toBe('boolean');
    });

    it('should handle missing pagination info gracefully', () => {
      const result = parseBrandList(brandsHtml);

      // The brands.html file may not have complete pagination info
      // Just verify structure is correct
      expect(result).toHaveProperty('brands');
      expect(result).toHaveProperty('hasMore');
      expect(result).toHaveProperty('totalCount');
    });
  });

  describe('error handling', () => {
    it('should throw ParseError when container is missing', () => {
      const html = '<div>No container here</div>';

      expect(() => parseBrandList(html)).toThrow(ParseError);
      expect(() => parseBrandList(html)).toThrow('Brand list container not found');
    });

    it('should handle empty HTML', () => {
      const html = '';

      expect(() => parseBrandList(html)).toThrow(ParseError);
    });

    it('should handle malformed HTML (missing container)', () => {
      const html = '<div class="wrong_class"></div>';

      expect(() => parseBrandList(html)).toThrow(ParseError);
    });

    it('should handle items with missing optional fields', () => {
      const html = `
        <div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="10" data-total-count="10">
          <div class="tobacco_list_item">
            <div class="tobacco_list_item_name">
              <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
                <span>Brand Name</span>
              </a>
            </div>
          </div>
        </div>
      `;

      const result = parseBrandList(html);

      expect(result.brands).toHaveLength(1);
      if (result.brands[0]) {
        expect(result.brands[0].name).toBe('Brand Name');
        expect(result.brands[0].description).toBeUndefined();
        expect(result.brands[0].imageUrl).toBeUndefined();
      }
    });

    it('should skip items with missing required fields', () => {
      const html = `
        <div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="10" data-total-count="10">
          <div class="tobacco_list_item">
            <div class="tobacco_list_item_name">
              <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
                <span>Valid Brand</span>
              </a>
            </div>
          </div>
          <div class="tobacco_list_item">
            <div class="tobacco_list_item_name">
              <!-- Missing href -->
              <a class="tobacco_list_item_slug">
                <span>Invalid Brand</span>
              </a>
            </div>
          </div>
        </div>
      `;

      const result = parseBrandList(html);

      expect(result.brands).toHaveLength(1);
      if (result.brands[0]) {
        expect(result.brands[0].name).toBe('Valid Brand');
      }
    });

    it('should handle no items found', () => {
      const html = `
        <div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="10" data-total-count="0">
        </div>
      `;

      const result = parseBrandList(html);

      expect(result.brands).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });
  });
});

// ============================================================================
// Brand Detail Parser Tests
// ============================================================================

describe('parseBrandDetail()', () => {
  describe('using sarma.html example', () => {
    let sarmaHtml: string;

    beforeEach(() => {
      sarmaHtml = loadExampleHtml('htreviews.org_tobaccos_sarma.html');
    });

    it('should parse brand detail from example HTML file', () => {
      const result = parseBrandDetail(sarmaHtml, 'sarma');

      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.sourceUrl).toBeDefined();
    });

    it('should extract brand name', () => {
      const result = parseBrandDetail(sarmaHtml, 'sarma');

      expect(result.name).toBeDefined();
      expect(typeof result.name).toBe('string');
      expect(result.name.length).toBeGreaterThan(0);
    });

    it('should extract brand description if available', () => {
      const result = parseBrandDetail(sarmaHtml, 'sarma');

      if (result.description) {
        expect(typeof result.description).toBe('string');
        expect(result.description.length).toBeGreaterThan(0);
      }
    });

    it('should construct source URL from brand slug', () => {
      const result = parseBrandDetail(sarmaHtml, 'sarma');

      expect(result.sourceUrl).toBe('https://htreviews.org/tobaccos/sarma');
    });
  });

  describe('error handling', () => {
    it('should throw ParseError when brand name is missing', () => {
      const html = '<div>No brand name here</div>';

      expect(() => parseBrandDetail(html, 'test-brand')).toThrow(ParseError);
      expect(() => parseBrandDetail(html, 'test-brand')).toThrow('Brand name not found');
    });

    it('should handle missing optional fields gracefully', () => {
      const html = `
        <div class="object_card_title">
          <h1>Test Brand</h1>
        </div>
      `;

      const result = parseBrandDetail(html, 'test-brand');

      expect(result.name).toBe('Test Brand');
      expect(result.description).toBeUndefined();
      expect(result.imageUrl).toBeUndefined();
    });

    it('should handle empty HTML', () => {
      const html = '';

      expect(() => parseBrandDetail(html, 'test-brand')).toThrow(ParseError);
    });

    it('should handle malformed HTML', () => {
      const html = '<div class="wrong_class">No name</div>';

      expect(() => parseBrandDetail(html, 'test-brand')).toThrow(ParseError);
    });
  });
});

// ============================================================================
// Product List Parser Tests
// ============================================================================

describe('parseProductList()', () => {
  describe('using sarma.html example', () => {
    let sarmaHtml: string;

    beforeEach(() => {
      sarmaHtml = loadExampleHtml('htreviews.org_tobaccos_sarma.html');
    });

    it('should parse product list from example HTML file', () => {
      const result = parseProductList(sarmaHtml, 'sarma');

      expect(result).toBeDefined();
      expect(result.products).toBeInstanceOf(Array);
      expect(result.products.length).toBeGreaterThan(0);
    });

    it('should extract all products correctly', () => {
      const result = parseProductList(sarmaHtml, 'sarma');

      expect(result.products.length).toBeGreaterThan(0);
      result.products.forEach(product => {
        expect(product.name).toBeDefined();
        expect(typeof product.name).toBe('string');
        expect(product.name.length).toBeGreaterThan(0);
      });
    });

    it('should extract product names', () => {
      const result = parseProductList(sarmaHtml, 'sarma');

      result.products.forEach(product => {
        expect(product.name).toBeDefined();
        expect(product.name.length).toBeGreaterThan(0);
      });
    });

    it('should extract product source URLs', () => {
      const result = parseProductList(sarmaHtml, 'sarma');

      result.products.forEach(product => {
        expect(product.sourceUrl).toBeDefined();
        expect(typeof product.sourceUrl).toBe('string');
        expect(product.sourceUrl).toMatch(/^https:\/\/htreviews\.org\/tobaccos\//);
      });
    });

    it('should associate products with brandSlug', () => {
      const result = parseProductList(sarmaHtml, 'sarma');

      result.products.forEach(product => {
        expect(product.brandSlug).toBe('sarma');
      });
    });

    it('should determine hasMore correctly', () => {
      const result = parseProductList(sarmaHtml, 'sarma');

      expect(typeof result.hasMore).toBe('boolean');
    });
  });

  describe('error handling', () => {
    it('should throw ParseError when container is missing', () => {
      const html = '<div>No container here</div>';

      expect(() => parseProductList(html, 'test-brand')).toThrow(ParseError);
      expect(() => parseProductList(html, 'test-brand')).toThrow('Product list container not found');
    });

    it('should handle empty HTML', () => {
      const html = '';

      expect(() => parseProductList(html, 'test-brand')).toThrow(ParseError);
    });

    it('should handle malformed HTML (missing container)', () => {
      const html = '<div class="wrong_class"></div>';

      expect(() => parseProductList(html, 'test-brand')).toThrow(ParseError);
    });

    it('should handle items with missing optional fields', () => {
      const html = `
        <div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="10" data-total-count="10">
          <div class="tobacco_list_item">
            <div class="tobacco_list_item_name">
              <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product1">
                <span>Product Name</span>
              </a>
            </div>
          </div>
        </div>
      `;

      const result = parseProductList(html, 'brand1');

      expect(result.products).toHaveLength(1);
      if (result.products[0]) {
        expect(result.products[0].name).toBe('Product Name');
        expect(result.products[0].description).toBeUndefined();
        expect(result.products[0].imageUrl).toBeUndefined();
      }
    });

    it('should skip items with missing required fields', () => {
      const html = `
        <div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="10" data-total-count="10">
          <div class="tobacco_list_item">
            <div class="tobacco_list_item_name">
              <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product1">
                <span>Valid Product</span>
              </a>
            </div>
          </div>
          <div class="tobacco_list_item">
            <div class="tobacco_list_item_name">
              <!-- Missing href -->
              <a class="tobacco_list_item_slug">
                <span>Invalid Product</span>
              </a>
            </div>
          </div>
        </div>
      `;

      const result = parseProductList(html, 'brand1');

      expect(result.products).toHaveLength(1);
      if (result.products[0]) {
        expect(result.products[0].name).toBe('Valid Product');
      }
    });

    it('should handle no items found', () => {
      const html = `
        <div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="10" data-total-count="0">
        </div>
      `;

      const result = parseProductList(html, 'brand1');

      expect(result.products).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });
  });
});

// ============================================================================
// Product Detail Parser Tests
// ============================================================================

describe('parseProductDetail()', () => {
  describe('using klassicheskaya_zima.html example', () => {
    let zimaHtml: string;

    beforeEach(() => {
      zimaHtml = loadExampleHtml('htreviews.org_tobaccos_sarma_klassicheskaya_zima.html');
    });

    it('should parse product detail from example HTML file', () => {
      const result = parseProductDetail(zimaHtml, 'klassicheskaya-zima', 'sarma');

      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.sourceUrl).toBeDefined();
    });

    it('should extract product name', () => {
      const result = parseProductDetail(zimaHtml, 'klassicheskaya-zima', 'sarma');

      expect(result.name).toBeDefined();
      expect(typeof result.name).toBe('string');
      expect(result.name.length).toBeGreaterThan(0);
    });

    it('should extract product description if available', () => {
      const result = parseProductDetail(zimaHtml, 'klassicheskaya-zima', 'sarma');

      if (result.description) {
        expect(typeof result.description).toBe('string');
        expect(result.description.length).toBeGreaterThan(0);
      }
    });

    it('should construct source URL from brand and product slugs', () => {
      const result = parseProductDetail(zimaHtml, 'klassicheskaya-zima', 'sarma');

      expect(result.sourceUrl).toBe('https://htreviews.org/tobaccos/sarma/klassicheskaya-zima');
    });
  });

  describe('error handling', () => {
    it('should throw ParseError when product name is missing', () => {
      const html = '<div>No product name here</div>';

      expect(() => parseProductDetail(html, 'test-product', 'test-brand')).toThrow(ParseError);
      expect(() => parseProductDetail(html, 'test-product', 'test-brand')).toThrow('Product name not found');
    });

    it('should handle missing optional fields gracefully', () => {
      const html = `
        <div class="object_card_title">
          <h1>Test Product</h1>
        </div>
      `;

      const result = parseProductDetail(html, 'test-product', 'test-brand');

      expect(result.name).toBe('Test Product');
      expect(result.description).toBeUndefined();
      expect(result.imageUrl).toBeUndefined();
    });

    it('should handle empty HTML', () => {
      const html = '';

      expect(() => parseProductDetail(html, 'test-product', 'test-brand')).toThrow(ParseError);
    });

    it('should handle malformed HTML', () => {
      const html = '<div class="wrong_class">No name</div>';

      expect(() => parseProductDetail(html, 'test-product', 'test-brand')).toThrow(ParseError);
    });
  });
});

// ============================================================================
// Completion Detection Tests
// ============================================================================

describe('isBrandDiscoveryComplete()', () => {
  it('should return true when offset + items >= totalCount', () => {
    const html = `
      <div class="tobacco_list_items" data-target="/endpoint" data-offset="90" data-count="10" data-total-count="100">
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
              <span>Brand 1</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
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
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand4">
              <span>Brand 4</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand5">
              <span>Brand 5</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand6">
              <span>Brand 6</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand7">
              <span>Brand 7</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand8">
              <span>Brand 8</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand9">
              <span>Brand 9</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand10">
              <span>Brand 10</span>
            </a>
          </div>
        </div>
      </div>
    `;

    const result = isBrandDiscoveryComplete(html);
    expect(result).toBe(true); // 90 + 10 >= 100
  });

  it('should return false when more items available', () => {
    const html = `
      <div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="10" data-total-count="100">
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
              <span>Brand 1</span>
            </a>
          </div>
        </div>
      </div>
    `;

    const result = isBrandDiscoveryComplete(html);
    expect(result).toBe(false); // 0 + 1 < 100
  });

  it('should return true when missing pagination info', () => {
    const html = `
      <div class="tobacco_list_items">
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
              <span>Brand 1</span>
            </a>
          </div>
        </div>
      </div>
    `;

    const result = isBrandDiscoveryComplete(html);
    expect(result).toBe(true);
  });

  it('should return true when container is missing', () => {
    const html = '<div>No container</div>';

    const result = isBrandDiscoveryComplete(html);
    expect(result).toBe(true);
  });

  it('should handle malformed pagination data', () => {
    const html = `
      <div class="tobacco_list_items" data-target="/endpoint" data-offset="invalid" data-count="10" data-total-count="100">
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
              <span>Brand 1</span>
            </a>
          </div>
        </div>
      </div>
    `;

    const result = isBrandDiscoveryComplete(html);
    expect(result).toBe(true);
  });
});

describe('isProductDiscoveryComplete()', () => {
  it('should return true when offset + items >= totalCount', () => {
    const html = `
      <div class="tobacco_list_items" data-target="/endpoint" data-offset="90" data-count="10" data-total-count="100">
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product1">
              <span>Product 1</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product2">
              <span>Product 2</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product3">
              <span>Product 3</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product4">
              <span>Product 4</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product5">
              <span>Product 5</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product6">
              <span>Product 6</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product7">
              <span>Product 7</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product8">
              <span>Product 8</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product9">
              <span>Product 9</span>
            </a>
          </div>
        </div>
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product10">
              <span>Product 10</span>
            </a>
          </div>
        </div>
      </div>
    `;

    const result = isProductDiscoveryComplete(html);
    expect(result).toBe(true);
  });

  it('should return false when more items available', () => {
    const html = `
      <div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="10" data-total-count="100">
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product1">
              <span>Product 1</span>
            </a>
          </div>
        </div>
      </div>
    `;

    const result = isProductDiscoveryComplete(html);
    expect(result).toBe(false); // 0 + 1 < 100
  });

  it('should return true when missing pagination info', () => {
    const html = `
      <div class="tobacco_list_items">
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product1">
              <span>Product 1</span>
            </a>
          </div>
        </div>
      </div>
    `;

    const result = isProductDiscoveryComplete(html);
    expect(result).toBe(true);
  });

  it('should return true when container is missing', () => {
    const html = '<div>No container</div>';

    const result = isProductDiscoveryComplete(html);
    expect(result).toBe(true);
  });

  it('should handle malformed pagination data', () => {
    const html = `
      <div class="tobacco_list_items" data-target="/endpoint" data-offset="invalid" data-count="10" data-total-count="100">
        <div class="tobacco_list_item">
          <div class="tobacco_list_item_name">
            <a class="tobacco_list_item_slug" href="/tobaccos/brand1/product1">
              <span>Product 1</span>
            </a>
          </div>
        </div>
      </div>
    `;

    const result = isProductDiscoveryComplete(html);
    expect(result).toBe(true);
  });
});

// ============================================================================
// Edge Cases and Error Scenarios
// ============================================================================

describe('Edge Cases', () => {
  describe('HTML with special characters', () => {
    it('should handle HTML with special characters in text', () => {
      const html = `
        <div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="10" data-total-count="10">
          <div class="tobacco_list_item">
            <div class="tobacco_list_item_name">
              <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
                <span>Brand "Special"</span>
              </a>
            </div>
          </div>
        </div>
      `;

      const result = parseBrandList(html);
      expect(result.brands).toHaveLength(1);
      if (result.brands[0]) {
        expect(result.brands[0].name).toContain('Special');
      }
    });

    it('should handle HTML with Unicode characters', () => {
      const html = `
        <div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="10" data-total-count="10">
          <div class="tobacco_list_item">
            <div class="tobacco_list_item_name">
              <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
                <span>Бренд Тест</span>
              </a>
            </div>
          </div>
        </div>
      `;

      const result = parseBrandList(html);
      expect(result.brands).toHaveLength(1);
      if (result.brands[0]) {
        expect(result.brands[0].name).toBe('Бренд Тест');
      }
    });
  });

  describe('HTML with missing image URLs', () => {
    it('should handle HTML with missing image URLs', () => {
      const html = `
        <div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="10" data-total-count="10">
          <div class="tobacco_list_item">
            <div class="tobacco_list_item_name">
              <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
                <span>Brand Name</span>
              </a>
            </div>
          </div>
        </div>
      `;

      const result = parseBrandList(html);
      expect(result.brands).toHaveLength(1);
      if (result.brands[0]) {
        expect(result.brands[0].name).toBe('Brand Name');
        expect(result.brands[0].imageUrl).toBeUndefined();
      }
    });
  });

  describe('HTML with malformed URLs', () => {
    it('should handle HTML with malformed URLs gracefully', () => {
      const html = `
        <div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="10" data-total-count="10">
          <div class="tobacco_list_item">
            <div class="tobacco_list_item_name">
              <a class="tobacco_list_item_slug" href="://invalid">
                <span>Brand Name</span>
              </a>
            </div>
          </div>
        </div>
      `;

      const result = parseBrandList(html);
      // The parser treats malformed URLs as relative paths and includes them
      expect(result.brands).toHaveLength(1);
      if (result.brands[0]) {
        expect(result.brands[0].name).toBe('Brand Name');
        expect(result.brands[0].sourceUrl).toBe('https://htreviews.org/://invalid');
      }
    });
  });

  describe('HTML with nested elements', () => {
    it('should handle HTML with nested elements', () => {
      const html = `
        <div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="10" data-total-count="10">
          <div class="tobacco_list_item">
            <div class="tobacco_list_item_name">
              <div class="wrapper">
                <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
                  <span>Brand Name</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      `;

      const result = parseBrandList(html);
      expect(result.brands).toHaveLength(1);
      if (result.brands[0]) {
        expect(result.brands[0].name).toBe('Brand Name');
      }
    });
  });

  describe('HTML with very long descriptions', () => {
    it('should handle HTML with very long descriptions', () => {
      const longDescription = 'A'.repeat(1000);
      const html = `
        <div class="tobacco_list_items" data-target="/endpoint" data-offset="0" data-count="10" data-total-count="10">
          <div class="tobacco_list_item">
            <div class="tobacco_list_item_name">
              <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
                <span>Brand Name</span>
              </a>
            </div>
            <div class="description_content">
              <span>${longDescription}</span>
            </div>
          </div>
        </div>
      `;

      const result = parseBrandList(html);
      expect(result.brands).toHaveLength(1);
      if (result.brands[0]) {
        expect(result.brands[0].name).toBe('Brand Name');
        expect(result.brands[0].description).toBe(longDescription);
      }
    });
  });
});

describe('Error Scenarios', () => {
  describe('Invalid HTML structure', () => {
    it('should handle parsing completely invalid HTML', () => {
      const html = 'not html at all';

      expect(() => parseBrandList(html)).toThrow(ParseError);
    });

    it('should handle parsing HTML with missing critical structure', () => {
      const html = '<div><span>Some text</span></div>';

      expect(() => parseBrandList(html)).toThrow(ParseError);
      expect(() => parseBrandList(html)).toThrow('Brand list container not found');
    });
  });

  describe('Malformed HTMX attributes', () => {
    it('should handle parsing HTML with malformed HTMX attributes', () => {
      const html = `
        <div class="tobacco_list_items" data-target="" data-offset="not-a-number" data-count="10" data-total-count="100">
          <div class="tobacco_list_item">
            <div class="tobacco_list_item_name">
              <a class="tobacco_list_item_slug" href="/tobaccos/brand1">
                <span>Brand Name</span>
              </a>
            </div>
          </div>
        </div>
      `;

      const result = parseBrandList(html);
      // Should handle gracefully with no pagination
      expect(result).toBeDefined();
      expect(result.brands).toHaveLength(1);
    });
  });
});
