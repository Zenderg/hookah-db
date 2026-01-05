/**
 * Unit Tests for HTML Parser Utilities
 * 
 * Tests all HTML parsing functions from packages/scraper/src/html-parser.ts
 */

import * as cheerio from 'cheerio';
import {
  extractText,
  extractAttribute,
  extractNumber,
  extractHtml,
  extractTextArray,
  extractAttributeArray,
  extractLinkUrl,
  parseViewsCount,
  parseDate,
  parseFlavorsCount,
  parseBoolean,
  parseInteger,
  parseFloatValue,
  parseRatingDistribution,
  parseSmokeAgainPercentage,
  extractImageUrl,
  extractSlugFromUrl,
  extractRating,
  buildUrl,
} from '@hookah-db/scraper';

// ============================================================================
// Text Extraction Functions Tests
// ============================================================================

describe('extractText', () => {
  it('should extract text from existing element', () => {
    const html = '<div class="test">Hello World</div>';
    const $ = cheerio.load(html);
    expect(extractText($, '.test')).toBe('Hello World');
  });

  it('should trim whitespace from extracted text', () => {
    const html = '<div class="test">  Hello World  </div>';
    const $ = cheerio.load(html);
    expect(extractText($, '.test')).toBe('Hello World');
  });

  it('should return empty string for missing element', () => {
    const html = '<div class="test">Hello</div>';
    const $ = cheerio.load(html);
    expect(extractText($, '.missing')).toBe('');
  });

  it('should extract text from first matching element', () => {
    const html = '<div class="test">First</div><div class="test">Second</div>';
    const $ = cheerio.load(html);
    expect(extractText($, '.test')).toBe('First');
  });

  it('should handle nested elements', () => {
    const html = '<div class="test"><span>Hello</span> <strong>World</strong></div>';
    const $ = cheerio.load(html);
    expect(extractText($, '.test')).toBe('Hello World');
  });

  it('should handle empty element', () => {
    const html = '<div class="test"></div>';
    const $ = cheerio.load(html);
    expect(extractText($, '.test')).toBe('');
  });
});

describe('extractAttribute', () => {
  it('should extract attribute from existing element', () => {
    const html = '<div class="test" data-value="123">Content</div>';
    const $ = cheerio.load(html);
    expect(extractAttribute($, '.test', 'data-value')).toBe('123');
  });

  it('should return null for missing element', () => {
    const html = '<div class="test">Content</div>';
    const $ = cheerio.load(html);
    expect(extractAttribute($, '.missing', 'data-value')).toBeNull();
  });

  it('should return null for missing attribute', () => {
    const html = '<div class="test">Content</div>';
    const $ = cheerio.load(html);
    expect(extractAttribute($, '.test', 'data-value')).toBeNull();
  });

  it('should extract href attribute', () => {
    const html = '<a class="test" href="https://example.com">Link</a>';
    const $ = cheerio.load(html);
    expect(extractAttribute($, '.test', 'href')).toBe('https://example.com');
  });

  it('should extract src attribute', () => {
    const html = '<img class="test" src="image.jpg" />';
    const $ = cheerio.load(html);
    expect(extractAttribute($, '.test', 'src')).toBe('image.jpg');
  });
});

describe('extractNumber', () => {
  it('should extract integer from text', () => {
    const html = '<div class="test">123</div>';
    const $ = cheerio.load(html);
    expect(extractNumber($, '.test')).toBe(123);
  });

  it('should extract decimal number from text', () => {
    const html = '<div class="test">123.45</div>';
    const $ = cheerio.load(html);
    expect(extractNumber($, '.test')).toBe(123.45);
  });

  it('should extract negative number from text', () => {
    const html = '<div class="test">-42.5</div>';
    const $ = cheerio.load(html);
    expect(extractNumber($, '.test')).toBe(-42.5);
  });

  it('should extract number from text with extra characters', () => {
    const html = '<div class="test">Price: $99.99</div>';
    const $ = cheerio.load(html);
    expect(extractNumber($, '.test')).toBe(99.99);
  });

  it('should return null for non-numeric text', () => {
    const html = '<div class="test">Hello World</div>';
    const $ = cheerio.load(html);
    expect(extractNumber($, '.test')).toBeNull();
  });

  it('should return null for missing element', () => {
    const html = '<div class="test">Content</div>';
    const $ = cheerio.load(html);
    expect(extractNumber($, '.missing')).toBeNull();
  });

  it('should return null for empty element', () => {
    const html = '<div class="test"></div>';
    const $ = cheerio.load(html);
    expect(extractNumber($, '.test')).toBeNull();
  });
});

describe('extractHtml', () => {
  it('should extract HTML content from element', () => {
    const html = '<div class="test"><span>Hello</span> <strong>World</strong></div>';
    const $ = cheerio.load(html);
    const result = extractHtml($, '.test');
    expect(result).toContain('<span>Hello</span>');
    expect(result).toContain('<strong>World</strong>');
  });

  it('should return empty string for missing element', () => {
    const html = '<div class="test">Content</div>';
    const $ = cheerio.load(html);
    expect(extractHtml($, '.missing')).toBe('');
  });

  it('should return empty string for element with no content', () => {
    const html = '<div class="test"></div>';
    const $ = cheerio.load(html);
    expect(extractHtml($, '.test')).toBe('');
  });

  it('should extract HTML from first matching element', () => {
    const html = '<div class="test"><span>First</span></div><div class="test"><span>Second</span></div>';
    const $ = cheerio.load(html);
    expect(extractHtml($, '.test')).toContain('First');
  });
});

describe('extractTextArray', () => {
  it('should extract text from multiple elements', () => {
    const html = '<div class="test">First</div><div class="test">Second</div><div class="test">Third</div>';
    const $ = cheerio.load(html);
    expect(extractTextArray($, '.test')).toEqual(['First', 'Second', 'Third']);
  });

  it('should trim whitespace from each text', () => {
    const html = '<div class="test">  First  </div><div class="test">  Second  </div>';
    const $ = cheerio.load(html);
    expect(extractTextArray($, '.test')).toEqual(['First', 'Second']);
  });

  it('should return empty array when no elements found', () => {
    const html = '<div class="other">Content</div>';
    const $ = cheerio.load(html);
    expect(extractTextArray($, '.test')).toEqual([]);
  });

  it('should skip empty text values', () => {
    const html = '<div class="test">First</div><div class="test"></div><div class="test">Third</div>';
    const $ = cheerio.load(html);
    expect(extractTextArray($, '.test')).toEqual(['First', 'Third']);
  });
});

describe('extractAttributeArray', () => {
  it('should extract attributes from multiple elements', () => {
    const html = '<a class="test" href="/link1">Link 1</a><a class="test" href="/link2">Link 2</a>';
    const $ = cheerio.load(html);
    expect(extractAttributeArray($, '.test', 'href')).toEqual(['/link1', '/link2']);
  });

  it('should return empty array when no elements found', () => {
    const html = '<div class="other">Content</div>';
    const $ = cheerio.load(html);
    expect(extractAttributeArray($, '.test', 'href')).toEqual([]);
  });

  it('should skip elements without the attribute', () => {
    const html = '<a class="test" href="/link1">Link 1</a><a class="test">Link 2</a>';
    const $ = cheerio.load(html);
    expect(extractAttributeArray($, '.test', 'href')).toEqual(['/link1']);
  });
});

describe('extractLinkUrl', () => {
  it('should extract href from anchor element', () => {
    const html = '<a class="test" href="https://example.com">Link</a>';
    const $ = cheerio.load(html);
    expect(extractLinkUrl($, '.test')).toBe('https://example.com');
  });

  it('should return null for missing element', () => {
    const html = '<div class="test">Content</div>';
    const $ = cheerio.load(html);
    expect(extractLinkUrl($, '.missing')).toBeNull();
  });

  it('should return null for element without href', () => {
    const html = '<a class="test">Link</a>';
    const $ = cheerio.load(html);
    expect(extractLinkUrl($, '.test')).toBeNull();
  });
});

// ============================================================================
// Special Format Parsers Tests
// ============================================================================

describe('parseViewsCount', () => {
  it('should parse views count with "k" suffix', () => {
    expect(parseViewsCount('319.1k')).toBe(319100);
  });

  it('should parse views count with "K" suffix (uppercase)', () => {
    expect(parseViewsCount('5.2K')).toBe(5200);
  });

  it('should parse views count with "kk" suffix', () => {
    expect(parseViewsCount('1.9kk')).toBe(1900000);
  });

  it('should parse views count with "KK" suffix (uppercase)', () => {
    expect(parseViewsCount('2.5KK')).toBe(2500000);
  });

  it('should parse plain number without suffix', () => {
    expect(parseViewsCount('1000')).toBe(1000);
  });

  it('should parse large plain number', () => {
    expect(parseViewsCount('1234567')).toBe(1234567);
  });

  it('should return null for empty string', () => {
    expect(parseViewsCount('')).toBeNull();
  });

  it('should return null for invalid format', () => {
    expect(parseViewsCount('invalid')).toBeNull();
  });

  it('should return null for whitespace only', () => {
    expect(parseViewsCount('   ')).toBeNull();
  });

  it('should handle decimal values with k suffix', () => {
    expect(parseViewsCount('0.5k')).toBe(500);
  });

  it('should handle decimal values with kk suffix', () => {
    expect(parseViewsCount('0.1kk')).toBe(100000);
  });
});

describe('parseDate', () => {
  it('should parse date in DD.MM.YYYY format', () => {
    const result = parseDate('06.12.2024');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
    expect(result?.getMonth()).toBe(11); // December is 11 (0-indexed)
    expect(result?.getDate()).toBe(6);
  });

  it('should parse date at start of year', () => {
    const result = parseDate('01.01.2020');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2020);
    expect(result?.getMonth()).toBe(0);
    expect(result?.getDate()).toBe(1);
  });

  it('should parse date at end of year', () => {
    const result = parseDate('31.12.2023');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2023);
    expect(result?.getMonth()).toBe(11);
    expect(result?.getDate()).toBe(31);
  });

  it('should return null for empty string', () => {
    expect(parseDate('')).toBeNull();
  });

  it('should return null for invalid format', () => {
    expect(parseDate('2024-12-06')).toBeNull();
  });

  it('should return null for invalid date', () => {
    expect(parseDate('32.13.2024')).toBeNull();
  });

  it('should return null for whitespace only', () => {
    expect(parseDate('   ')).toBeNull();
  });

  it('should handle leap year date', () => {
    const result = parseDate('29.02.2024');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
    expect(result?.getMonth()).toBe(1);
    expect(result?.getDate()).toBe(29);
  });
});

describe('parseFlavorsCount', () => {
  it('should parse flavors count with "вкуса" suffix', () => {
    expect(parseFlavorsCount('53 вкуса')).toBe(53);
  });

  it('should parse flavors count with "вкус" suffix', () => {
    expect(parseFlavorsCount('21 вкус')).toBe(21);
  });

  it('should parse flavors count with "вкусов" suffix', () => {
    expect(parseFlavorsCount('100 вкусов')).toBe(100);
  });

  it('should parse single flavor', () => {
    expect(parseFlavorsCount('1 вкус')).toBe(1);
  });

  it('should handle extra whitespace', () => {
    expect(parseFlavorsCount('  53   вкуса  ')).toBe(53);
  });

  it('should handle uppercase suffix', () => {
    expect(parseFlavorsCount('53 ВКУСА')).toBe(53);
  });

  it('should return null for empty string', () => {
    expect(parseFlavorsCount('')).toBeNull();
  });

  it('should return null for invalid format', () => {
    expect(parseFlavorsCount('invalid')).toBeNull();
  });

  it('should return null for number without suffix', () => {
    expect(parseFlavorsCount('53')).toBeNull();
  });
});

describe('parseBoolean', () => {
  it('should parse "true" as true', () => {
    expect(parseBoolean('true')).toBe(true);
  });

  it('should parse "yes" as true', () => {
    expect(parseBoolean('yes')).toBe(true);
  });

  it('should parse "1" as true', () => {
    expect(parseBoolean('1')).toBe(true);
  });

  it('should parse "да" as true', () => {
    expect(parseBoolean('да')).toBe(true);
  });

  it('should parse "есть" as true', () => {
    expect(parseBoolean('есть')).toBe(true);
  });

  it('should parse "включено" as true', () => {
    expect(parseBoolean('включено')).toBe(true);
  });

  it('should parse "false" as false', () => {
    expect(parseBoolean('false')).toBe(false);
  });

  it('should parse "no" as false', () => {
    expect(parseBoolean('no')).toBe(false);
  });

  it('should parse "0" as false', () => {
    expect(parseBoolean('0')).toBe(false);
  });

  it('should parse "нет" as false', () => {
    expect(parseBoolean('нет')).toBe(false);
  });

  it('should parse "нету" as false', () => {
    expect(parseBoolean('нету')).toBe(false);
  });

  it('should parse "выключено" as false', () => {
    expect(parseBoolean('выключено')).toBe(false);
  });

  it('should handle case insensitivity', () => {
    expect(parseBoolean('TRUE')).toBe(true);
    expect(parseBoolean('False')).toBe(false);
  });

  it('should return null for empty string', () => {
    expect(parseBoolean('')).toBeNull();
  });

  it('should return null for null input', () => {
    expect(parseBoolean(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(parseBoolean(undefined)).toBeNull();
  });

  it('should return null for invalid value', () => {
    expect(parseBoolean('invalid')).toBeNull();
  });

  it('should handle whitespace', () => {
    expect(parseBoolean('  true  ')).toBe(true);
  });
});

describe('parseInteger', () => {
  it('should parse positive integer', () => {
    expect(parseInteger('123')).toBe(123);
  });

  it('should parse negative integer', () => {
    expect(parseInteger('-456')).toBe(-456);
  });

  it('should parse zero', () => {
    expect(parseInteger('0')).toBe(0);
  });

  it('should handle whitespace', () => {
    expect(parseInteger('  789  ')).toBe(789);
  });

  it('should return null for empty string', () => {
    expect(parseInteger('')).toBeNull();
  });

  it('should return null for null input', () => {
    expect(parseInteger(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(parseInteger(undefined)).toBeNull();
  });

  it('should return null for non-numeric string', () => {
    expect(parseInteger('invalid')).toBeNull();
  });

  it('should parse integer from decimal string (truncates)', () => {
    expect(parseInteger('123.45')).toBe(123);
  });
});

describe('parseFloatValue', () => {
  it('should parse positive float', () => {
    expect(parseFloatValue('123.45')).toBe(123.45);
  });

  it('should parse negative float', () => {
    expect(parseFloatValue('-456.78')).toBe(-456.78);
  });

  it('should parse integer as float', () => {
    expect(parseFloatValue('123')).toBe(123);
  });

  it('should parse zero', () => {
    expect(parseFloatValue('0')).toBe(0);
  });

  it('should parse decimal with leading zero', () => {
    expect(parseFloatValue('0.5')).toBe(0.5);
  });

  it('should handle whitespace', () => {
    expect(parseFloatValue('  123.45  ')).toBe(123.45);
  });

  it('should return null for empty string', () => {
    expect(parseFloatValue('')).toBeNull();
  });

  it('should return null for null input', () => {
    expect(parseFloatValue(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(parseFloatValue(undefined)).toBeNull();
  });

  it('should return null for non-numeric string', () => {
    expect(parseFloatValue('invalid')).toBeNull();
  });
});

// ============================================================================
// Rating Distribution Parser Tests
// ============================================================================

describe('parseRatingDistribution', () => {
  it('should parse complete rating distribution with data attributes', () => {
    const html = `
      <div class="score_meter">
        <div class="item">
          <span data-score="5">★★★★★</span>
          <span data-score-count="123"></span>
        </div>
        <div class="item">
          <span data-score="4">★★★★</span>
          <span data-score-count="45"></span>
        </div>
        <div class="item">
          <span data-score="3">★★★</span>
          <span data-score-count="12"></span>
        </div>
        <div class="item">
          <span data-score="2">★★</span>
          <span data-score-count="3"></span>
        </div>
        <div class="item">
          <span data-score="1">★</span>
          <span data-score-count="1"></span>
        </div>
      </div>
    `;
    const $ = cheerio.load(html);
    const result = parseRatingDistribution($, '.score_meter .item');
    
    expect(result).toEqual({
      count1: 1,
      count2: 3,
      count3: 12,
      count4: 45,
      count5: 123,
    });
  });

  it('should parse partial rating distribution (some stars missing)', () => {
    const html = `
      <div class="score_meter">
        <div class="item">
          <span data-score="5">★★★★★</span>
          <span data-score-count="100"></span>
        </div>
        <div class="item">
          <span data-score="4">★★★★</span>
          <span data-score-count="50"></span>
        </div>
      </div>
    `;
    const $ = cheerio.load(html);
    const result = parseRatingDistribution($, '.score_meter .item');
    
    expect(result).toEqual({
      count1: 0,
      count2: 0,
      count3: 0,
      count4: 50,
      count5: 100,
    });
  });

  it('should return all zeros for empty rating distribution', () => {
    const html = '<div class="score_meter"></div>';
    const $ = cheerio.load(html);
    const result = parseRatingDistribution($, '.score_meter .item');
    
    expect(result).toEqual({
      count1: 0,
      count2: 0,
      count3: 0,
      count4: 0,
      count5: 0,
    });
  });

  it('should fallback to text parsing when data attributes missing', () => {
    const html = `
      <div class="score_meter">
        <div class="item">5: 123</div>
        <div class="item">4: 45</div>
        <div class="item">3: 12</div>
        <div class="item">2: 3</div>
        <div class="item">1: 1</div>
      </div>
    `;
    const $ = cheerio.load(html);
    const result = parseRatingDistribution($, '.score_meter .item');
    
    expect(result).toEqual({
      count1: 1,
      count2: 3,
      count3: 12,
      count4: 45,
      count5: 123,
    });
  });

  it('should handle text format with dash separator', () => {
    const html = `
      <div class="score_meter">
        <div class="item">5 - 100</div>
        <div class="item">4 - 50</div>
      </div>
    `;
    const $ = cheerio.load(html);
    const result = parseRatingDistribution($, '.score_meter .item');
    
    expect(result).toEqual({
      count1: 0,
      count2: 0,
      count3: 0,
      count4: 50,
      count5: 100,
    });
  });

  it('should ignore invalid ratings outside 1-5 range', () => {
    const html = `
      <div class="score_meter">
        <div class="item">
          <span data-score="5">★★★★★</span>
          <span data-score-count="100"></span>
        </div>
        <div class="item">
          <span data-score="6">★★★★★★</span>
          <span data-score-count="50"></span>
        </div>
      </div>
    `;
    const $ = cheerio.load(html);
    const result = parseRatingDistribution($, '.score_meter .item');
    
    expect(result).toEqual({
      count1: 0,
      count2: 0,
      count3: 0,
      count4: 0,
      count5: 100,
    });
  });

  it('should handle items without required spans', () => {
    const html = `
      <div class="score_meter">
        <div class="item">
          <span data-score="5">★★★★★</span>
        </div>
      </div>
    `;
    const $ = cheerio.load(html);
    const result = parseRatingDistribution($, '.score_meter .item');
    
    expect(result).toEqual({
      count1: 0,
      count2: 0,
      count3: 0,
      count4: 0,
      count5: 0,
    });
  });
});

// ============================================================================
// Smoke Again Percentage Parser Tests
// ============================================================================

describe('parseSmokeAgainPercentage', () => {
  it('should parse valid percentage', () => {
    const html = '<div class="again_meter">85%</div>';
    const $ = cheerio.load(html);
    expect(parseSmokeAgainPercentage($, '.again_meter')).toBe(85);
  });

  it('should parse percentage with space before %', () => {
    const html = '<div class="again_meter">75 %</div>';
    const $ = cheerio.load(html);
    expect(parseSmokeAgainPercentage($, '.again_meter')).toBe(75);
  });

  it('should parse decimal percentage', () => {
    const html = '<div class="again_meter">87.5%</div>';
    const $ = cheerio.load(html);
    expect(parseSmokeAgainPercentage($, '.again_meter')).toBe(87.5);
  });

  it('should parse 0%', () => {
    const html = '<div class="again_meter">0%</div>';
    const $ = cheerio.load(html);
    expect(parseSmokeAgainPercentage($, '.again_meter')).toBe(0);
  });

  it('should parse 100%', () => {
    const html = '<div class="again_meter">100%</div>';
    const $ = cheerio.load(html);
    expect(parseSmokeAgainPercentage($, '.again_meter')).toBe(100);
  });

  it('should return null for missing element', () => {
    const html = '<div class="test">Content</div>';
    const $ = cheerio.load(html);
    expect(parseSmokeAgainPercentage($, '.again_meter')).toBeNull();
  });

  it('should return null for empty element', () => {
    const html = '<div class="again_meter"></div>';
    const $ = cheerio.load(html);
    expect(parseSmokeAgainPercentage($, '.again_meter')).toBeNull();
  });

  it('should return null for text without percentage', () => {
    const html = '<div class="again_meter">No percentage here</div>';
    const $ = cheerio.load(html);
    expect(parseSmokeAgainPercentage($, '.again_meter')).toBeNull();
  });

  it('should return null for invalid percentage format', () => {
    const html = '<div class="again_meter">%85</div>';
    const $ = cheerio.load(html);
    expect(parseSmokeAgainPercentage($, '.again_meter')).toBeNull();
  });

  it('should extract percentage from text with extra content', () => {
    const html = '<div class="again_meter">Would smoke again: 92%</div>';
    const $ = cheerio.load(html);
    expect(parseSmokeAgainPercentage($, '.again_meter')).toBe(92);
  });
});

// ============================================================================
// Image URL Extractor Tests
// ============================================================================

describe('extractImageUrl', () => {
  it('should extract from data-src attribute (lazy loading)', () => {
    const html = '<img class="test" data-src="lazy-image.jpg" src="placeholder.jpg" />';
    const $ = cheerio.load(html);
    expect(extractImageUrl($, '.test')).toBe('lazy-image.jpg');
  });

  it('should fallback to src attribute when data-src missing', () => {
    const html = '<img class="test" src="image.jpg" />';
    const $ = cheerio.load(html);
    expect(extractImageUrl($, '.test')).toBe('image.jpg');
  });

  it('should fallback to srcset when data-src and src missing', () => {
    const html = '<img class="test" srcset="image-1x.jpg 1x, image-2x.jpg 2x" />';
    const $ = cheerio.load(html);
    expect(extractImageUrl($, '.test')).toBe('image-1x.jpg');
  });

  it('should return null for missing element', () => {
    const html = '<div class="test">Content</div>';
    const $ = cheerio.load(html);
    expect(extractImageUrl($, '.missing')).toBeNull();
  });

  it('should return null for element without any image source', () => {
    const html = '<img class="test" alt="Image" />';
    const $ = cheerio.load(html);
    expect(extractImageUrl($, '.test')).toBeNull();
  });

  it('should return null for empty srcset', () => {
    const html = '<img class="test" srcset="" />';
    const $ = cheerio.load(html);
    expect(extractImageUrl($, '.test')).toBeNull();
  });

  it('should prioritize data-src over src', () => {
    const html = '<img class="test" data-src="real.jpg" src="placeholder.jpg" />';
    const $ = cheerio.load(html);
    expect(extractImageUrl($, '.test')).toBe('real.jpg');
  });
});

// ============================================================================
// Slug Extractor Tests
// ============================================================================

describe('extractSlugFromUrl', () => {
  it('should extract slug from simple path', () => {
    expect(extractSlugFromUrl('/tobaccos/sarma')).toBe('tobaccos/sarma');
  });

  it('should extract multi-level slug', () => {
    expect(extractSlugFromUrl('/tobaccos/sarma/klassicheskaya/zima')).toBe('tobaccos/sarma/klassicheskaya/zima');
  });

  it('should extract slug from full URL', () => {
    expect(extractSlugFromUrl('https://htreviews.org/tobaccos/sarma')).toBe('tobaccos/sarma');
  });

  it('should extract slug from URL with query parameters', () => {
    expect(extractSlugFromUrl('https://htreviews.org/tobaccos/sarma?page=1')).toBe('tobaccos/sarma');
  });

  it('should return null for empty string', () => {
    expect(extractSlugFromUrl('')).toBeNull();
  });

  it('should return null for null input', () => {
    expect(extractSlugFromUrl(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(extractSlugFromUrl(undefined)).toBeNull();
  });

  it('should return null for path with only slashes', () => {
    expect(extractSlugFromUrl('///')).toBeNull();
  });

  it('should handle path without leading slash', () => {
    expect(extractSlugFromUrl('tobaccos/sarma')).toBe('tobaccos/sarma');
  });

  it('should handle trailing slash', () => {
    expect(extractSlugFromUrl('/tobaccos/sarma/')).toBe('tobaccos/sarma');
  });

  it('should handle multiple slashes', () => {
    expect(extractSlugFromUrl('///tobaccos///sarma///')).toBe('tobaccos/sarma');
  });

  it('should handle root path', () => {
    expect(extractSlugFromUrl('/')).toBeNull();
  });

  it('should handle URL with port', () => {
    expect(extractSlugFromUrl('http://localhost:3000/tobaccos/sarma')).toBe('tobaccos/sarma');
  });
});

// ============================================================================
// Rating Parser Tests
// ============================================================================

describe('extractRating', () => {
  it('should extract integer rating', () => {
    const html = '<div class="test">5</div>';
    const $ = cheerio.load(html);
    expect(extractRating($, '.test')).toBe(5);
  });

  it('should extract decimal rating', () => {
    const html = '<div class="test">4.5</div>';
    const $ = cheerio.load(html);
    expect(extractRating($, '.test')).toBe(4.5);
  });

  it('should extract rating from text with extra content', () => {
    const html = '<div class="test">Rating: 4.7 out of 5</div>';
    const $ = cheerio.load(html);
    expect(extractRating($, '.test')).toBe(4.7);
  });

  it('should return null for rating below 0', () => {
    const html = '<div class="test">-1</div>';
    const $ = cheerio.load(html);
    expect(extractRating($, '.test')).toBeNull();
  });

  it('should return null for rating above 5', () => {
    const html = '<div class="test">6</div>';
    const $ = cheerio.load(html);
    expect(extractRating($, '.test')).toBeNull();
  });

  it('should return null for missing element', () => {
    const html = '<div class="test">Content</div>';
    const $ = cheerio.load(html);
    expect(extractRating($, '.missing')).toBeNull();
  });

  it('should return null for non-numeric text', () => {
    const html = '<div class="test">Excellent</div>';
    const $ = cheerio.load(html);
    expect(extractRating($, '.test')).toBeNull();
  });

  it('should return null for empty element', () => {
    const html = '<div class="test"></div>';
    const $ = cheerio.load(html);
    expect(extractRating($, '.test')).toBeNull();
  });

  it('should extract 0 rating', () => {
    const html = '<div class="test">0</div>';
    const $ = cheerio.load(html);
    expect(extractRating($, '.test')).toBe(0);
  });

  it('should extract 5 rating', () => {
    const html = '<div class="test">5</div>';
    const $ = cheerio.load(html);
    expect(extractRating($, '.test')).toBe(5);
  });
});

// ============================================================================
// URL Builder Tests
// ============================================================================

describe('buildUrl', () => {
  it('should build URL from base and path', () => {
    expect(buildUrl('https://example.com', '/api/data')).toBe('https://example.com/api/data');
  });

  it('should handle base without trailing slash', () => {
    expect(buildUrl('https://example.com', 'api/data')).toBe('https://example.com/api/data');
  });

  it('should handle base with trailing slash', () => {
    expect(buildUrl('https://example.com/', '/api/data')).toBe('https://example.com/api/data');
  });

  it('should handle path without leading slash', () => {
    expect(buildUrl('https://example.com', 'api/data')).toBe('https://example.com/api/data');
  });

  it('should handle multiple slashes', () => {
    expect(buildUrl('https://example.com///', '///api///data')).toBe('https://example.com/api/data');
  });

  it('should handle relative base URL', () => {
    expect(buildUrl('/api', '/v1/data')).toBe('/api/v1/data');
  });

  it('should handle empty path', () => {
    expect(buildUrl('https://example.com', '')).toBe('https://example.com/');
  });

  it('should handle path with query parameters', () => {
    expect(buildUrl('https://example.com', '/api/data?param=value')).toBe('https://example.com/api/data?param=value');
  });
});
