/**
 * Unit tests for Scraper
 * 
 * Tests scraper functionality including:
 * - Fetching HTML content
 * - Parsing HTML with Cheerio
 * - Error handling
 * - Retry logic
 */

import axios from 'axios';
import { Scraper, HttpClientError } from '../../src/scraper';

// Mock axios module
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ============================================================================
// Test Suite
// ============================================================================

describe('Scraper', () => {
  let scraper: Scraper;

  beforeEach(() => {
    scraper = new Scraper();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // Tests for fetchAndParse method
  // ============================================================================

  describe('fetchAndParse', () => {
    it('should fetch and parse HTML successfully', async () => {
      const mockHtml = '<html><body><div class="test">Test Content</div></body></html>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($).toBeDefined();
      expect($('.test').text()).toBe('Test Content');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com', {
        headers: {
          'User-Agent': expect.any(String),
        },
      });
    });

    it('should handle HTTP errors', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: 'Not Found',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(scraper.fetchAndParse('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network Error');
      (mockError as any).isAxiosError = true;

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(scraper.fetchAndParse('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout errors', async () => {
      const mockError = new Error('Request timeout');
      (mockError as any).isAxiosError = true;
      (mockError as any).code = 'ECONNABORTED';

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(scraper.fetchAndParse('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should parse complex HTML structure', async () => {
      const mockHtml = `
        <html>
          <head>
            <title>Test Page</title>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Header</h1>
              </div>
              <div class="content">
                <p>Paragraph 1</p>
                <p>Paragraph 2</p>
              </div>
              <div class="footer">
                <span>Footer</span>
              </div>
            </div>
          </body>
        </html>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('title').text()).toBe('Test Page');
      expect($('h1').text()).toBe('Header');
      expect($('p').length).toBe(2);
      expect($('p').eq(0).text()).toBe('Paragraph 1');
      expect($('p').eq(1).text()).toBe('Paragraph 2');
      expect($('.footer span').text()).toBe('Footer');
    });

    it('should handle malformed HTML', async () => {
      const mockHtml = '<div><span>Unclosed</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('span').text()).toBe('Unclosed');
    });

    it('should handle HTML with special characters', async () => {
      const mockHtml = '<div>Special chars: < > & " '</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('div').text()).toBe('Special chars: < > & " \'');
    });

    it('should handle HTML with Unicode characters', async () => {
      const mockHtml = '<div>Русский текст: Привет мир!</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('div').text()).toBe('Русский текст: Привет мир!');
    });

    it('should handle HTML with empty elements', async () => {
      const mockHtml = `
        <div></div>
        <span></span>
        <p></p>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('div').text()).toBe('');
      expect($('span').text()).toBe('');
      expect($('p').text()).toBe('');
    });

    it('should handle HTML with self-closing tags', async () => {
      const mockHtml = `
        <div>
          <img src="test.jpg" alt="Test" />
          <br />
          <hr />
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('img').attr('src')).toBe('test.jpg');
      expect($('img').attr('alt')).toBe('Test');
      expect($('br').length).toBe(1);
      expect($('hr').length).toBe(1);
    });

    it('should handle HTML with comments', async () => {
      const mockHtml = `
        <div>
          <!-- This is a comment -->
          <span>Content</span>
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('span').text()).toBe('Content');
    });

    it('should handle HTML with CDATA sections', async () => {
      const mockHtml = `
        <div>
          <![CDATA[This is CDATA content]]>
          <span>Content</span>
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('span').text()).toBe('Content');
    });

    it('should handle HTML with nested elements', async () => {
      const mockHtml = `
        <div class="outer">
          <div class="middle">
            <div class="inner">
              <span>Deeply Nested</span>
            </div>
          </div>
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.outer .middle .inner span').text()).toBe('Deeply Nested');
    });

    it('should handle HTML with attributes', async () => {
      const mockHtml = `
        <div class="test" id="main" data-value="123">
          Content
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.test').attr('id')).toBe('main');
      expect($('.test').attr('data-value')).toBe('123');
    });

    it('should handle HTML with multiple elements', async () => {
      const mockHtml = `
        <div class="container">
          <div class="item">Item 1</div>
          <div class="item">Item 2</div>
          <div class="item">Item 3</div>
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.item').length).toBe(3);
      expect($('.item').eq(0).text()).toBe('Item 1');
      expect($('.item').eq(1).text()).toBe('Item 2');
      expect($('.item').eq(2).text()).toBe('Item 3');
    });
  });

  // ============================================================================
  // Tests for HTTP client integration
  // ============================================================================

  describe('HTTP Client Integration', () => {
    it('should use HTTP client to fetch content', async () => {
      const mockHtml = '<div>Test Content</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await scraper.fetchAndParse('https://example.com');

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should pass URL to HTTP client', async () => {
      const mockHtml = '<div>Test Content</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await scraper.fetchAndParse('https://example.com/path/to/resource');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/path/to/resource',
        expect.any(Object)
      );
    });

    it('should include User-Agent header', async () => {
      const mockHtml = '<div>Test Content</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await scraper.fetchAndParse('https://example.com');

      const callArgs = mockedAxios.get.mock.calls[0];
      expect(callArgs[1].headers['User-Agent']).toBeDefined();
      expect(typeof callArgs[1].headers['User-Agent']).toBe('string');
    });
  });

  // ============================================================================
  // Tests for Cheerio API compatibility
  // ============================================================================

  describe('Cheerio API', () => {
    it('should support selector queries', async () => {
      const mockHtml = `
        <div class="container">
          <div class="item">Item 1</div>
          <div class="item">Item 2</div>
          <div class="item">Item 3</div>
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.item').length).toBe(3);
      expect($('.item').eq(0).text()).toBe('Item 1');
      expect($('.item').eq(1).text()).toBe('Item 2');
      expect($('.item').eq(2).text()).toBe('Item 3');
    });

    it('should support attribute selectors', async () => {
      const mockHtml = `
        <div data-id="1">First</div>
        <div data-id="2">Second</div>
        <div data-id="3">Third</div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('[data-id="2"]').text()).toBe('Second');
    });

    it('should support class selectors', async () => {
      const mockHtml = `
        <div class="test primary">Primary</div>
        <div class="test secondary">Secondary</div>
        <div class="test tertiary">Tertiary</div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.test').length).toBe(3);
      expect($('.primary').text()).toBe('Primary');
      expect($('.secondary').text()).toBe('Secondary');
      expect($('.tertiary').text()).toBe('Tertiary');
    });

    it('should support ID selectors', async () => {
      const mockHtml = `
        <div id="main">Main</div>
        <div id="content">Content</div>
        <div id="footer">Footer</div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('#main').text()).toBe('Main');
      expect($('#content').text()).toBe('Content');
      expect($('#footer').text()).toBe('Footer');
    });

    it('should support descendant selectors', async () => {
      const mockHtml = `
        <div class="container">
          <div class="wrapper">
            <span class="text">Nested Text</span>
          </div>
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.container .wrapper .text').text()).toBe('Nested Text');
    });

    it('should support child selectors', async () => {
      const mockHtml = `
        <div class="container">
          <span class="text">Direct Child</span>
          <div class="wrapper">
            <span class="text">Nested Child</span>
          </div>
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.container > .text').text()).toBe('Direct Child');
    });

    it('should support multiple selectors', async () => {
      const mockHtml = `
        <div class="primary">Primary</div>
        <span class="secondary">Secondary</span>
        <div class="tertiary">Tertiary</div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.primary, .secondary').length).toBe(2);
    });

    it('should support pseudo-selectors', async () => {
      const mockHtml = `
        <ul>
          <li>First</li>
          <li>Second</li>
          <li>Third</li>
        </ul>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('li:first').text()).toBe('First');
      expect($('li:last').text()).toBe('Third');
      expect($('li:nth-child(2)').text()).toBe('Second');
    });

    it('should support each() method', async () => {
      const mockHtml = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      const items: string[] = [];
      $('.item').each((i, el) => {
        items.push($(el).text());
      });

      expect(items).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('should support map() method', async () => {
      const mockHtml = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      const items = $('.item').map((i, el) => $(el).text()).get();

      expect(items).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('should support filter() method', async () => {
      const mockHtml = `
        <div class="item active">Active 1</div>
        <div class="item">Inactive</div>
        <div class="item active">Active 2</div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      const activeItems = $('.item').filter('.active');

      expect(activeItems.length).toBe(2);
      expect(activeItems.eq(0).text()).toBe('Active 1');
      expect(activeItems.eq(1).text()).toBe('Active 2');
    });

    it('should support find() method', async () => {
      const mockHtml = `
        <div class="container">
          <div class="wrapper">
            <span class="text">Text 1</span>
          </div>
          <div class="wrapper">
            <span class="text">Text 2</span>
          </div>
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      const container = $('.container');
      const texts = container.find('.text');

      expect(texts.length).toBe(2);
      expect(texts.eq(0).text()).toBe('Text 1');
      expect(texts.eq(1).text()).toBe('Text 2');
    });

    it('should support parent() method', async () => {
      const mockHtml = `
        <div class="container">
          <div class="wrapper">
            <span class="text">Text</span>
          </div>
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      const text = $('.text');
      const wrapper = text.parent();
      const container = text.parent().parent();

      expect(wrapper.hasClass('wrapper')).toBe(true);
      expect(container.hasClass('container')).toBe(true);
    });

    it('should support children() method', async () => {
      const mockHtml = `
        <div class="container">
          <span>Child 1</span>
          <span>Child 2</span>
          <span>Child 3</span>
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      const children = $('.container').children();

      expect(children.length).toBe(3);
      expect(children.eq(0).text()).toBe('Child 1');
      expect(children.eq(1).text()).toBe('Child 2');
      expect(children.eq(2).text()).toBe('Child 3');
    });

    it('should support siblings() method', async () => {
      const mockHtml = `
        <div>
          <span class="prev">Previous</span>
          <span class="current">Current</span>
          <span class="next">Next</span>
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      const siblings = $('.current').siblings();

      expect(siblings.length).toBe(2);
      expect(siblings.eq(0).hasClass('prev')).toBe(true);
      expect(siblings.eq(1).hasClass('next')).toBe(true);
    });

    it('should support next() method', async () => {
      const mockHtml = `
        <div>
          <span class="first">First</span>
          <span class="second">Second</span>
          <span class="third">Third</span>
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      const second = $('.first').next();
      const third = $('.first').next().next();

      expect(second.hasClass('second')).toBe(true);
      expect(third.hasClass('third')).toBe(true);
    });

    it('should support prev() method', async () => {
      const mockHtml = `
        <div>
          <span class="first">First</span>
          <span class="second">Second</span>
          <span class="third">Third</span>
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      const second = $('.third').prev();
      const first = $('.third').prev().prev();

      expect(second.hasClass('second')).toBe(true);
      expect(first.hasClass('first')).toBe(true);
    });

    it('should support addClass() method', async () => {
      const mockHtml = '<div class="test">Content</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      $('.test').addClass('active');

      expect($('.test').hasClass('active')).toBe(true);
    });

    it('should support removeClass() method', async () => {
      const mockHtml = '<div class="test active">Content</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      $('.test').removeClass('active');

      expect($('.test').hasClass('active')).toBe(false);
    });

    it('should support toggleClass() method', async () => {
      const mockHtml = '<div class="test">Content</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      $('.test').toggleClass('active');
      expect($('.test').hasClass('active')).toBe(true);

      $('.test').toggleClass('active');
      expect($('.test').hasClass('active')).toBe(false);
    });

    it('should support attr() method', async () => {
      const mockHtml = '<div class="test" id="main" data-value="123">Content</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.test').attr('id')).toBe('main');
      expect($('.test').attr('data-value')).toBe('123');
    });

    it('should support data() method', async () => {
      const mockHtml = '<div class="test" data-id="123" data-name="test">Content</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.test').data('id')).toBe('123');
      expect($('.test').data('name')).toBe('test');
    });

    it('should support text() method', async () => {
      const mockHtml = '<div class="test">Text content</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.test').text()).toBe('Text content');
    });

    it('should support html() method', async () => {
      const mockHtml = '<div class="test"><span>Nested</span></div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.test').html()).toBe('<span>Nested</span>');
    });

    it('should support is() method', async () => {
      const mockHtml = '<div class="test active">Content</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.test').is('.active')).toBe(true);
      expect($('.test').is('.inactive')).toBe(false);
    });

    it('should support has() method', async () => {
      const mockHtml = `
        <div class="container">
          <div class="wrapper">
            <span class="text">Text</span>
          </div>
        </div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.container').has('.text').length).toBe(1);
      expect($('.container').has('.missing').length).toBe(0);
    });

    it('should support index() method', async () => {
      const mockHtml = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      const items = $('.item');
      expect(items.index(items.eq(0))).toBe(0);
      expect(items.index(items.eq(1))).toBe(1);
      expect(items.index(items.eq(2))).toBe(2);
    });

    it('should support length property', async () => {
      const mockHtml = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.item').length).toBe(3);
    });

    it('should support eq() method', async () => {
      const mockHtml = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.item').eq(0).text()).toBe('Item 1');
      expect($('.item').eq(1).text()).toBe('Item 2');
      expect($('.item').eq(2).text()).toBe('Item 3');
    });

    it('should support first() method', async () => {
      const mockHtml = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.item').first().text()).toBe('Item 1');
    });

    it('should support last() method', async () => {
      const mockHtml = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.item').last().text()).toBe('Item 3');
    });
  });

  // ============================================================================
  // Tests for error handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle 404 Not Found', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: 'Not Found',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(scraper.fetchAndParse('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle 500 Internal Server Error', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: 'Internal Server Error',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(scraper.fetchAndParse('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle 503 Service Unavailable', async () => {
      const mockError = {
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          data: 'Service Unavailable',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(scraper.fetchAndParse('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle 429 Too Many Requests', async () => {
      const mockError = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: 'Too Many Requests',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(scraper.fetchAndParse('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle 403 Forbidden', async () => {
      const mockError = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: 'Forbidden',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(scraper.fetchAndParse('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle 401 Unauthorized', async () => {
      const mockError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: 'Unauthorized',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(scraper.fetchAndParse('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle 400 Bad Request', async () => {
      const mockError = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: 'Bad Request',
        },
        isAxiosError: true,
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(scraper.fetchAndParse('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network Error');
      (mockError as any).isAxiosError = true;

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(scraper.fetchAndParse('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout errors', async () => {
      const mockError = new Error('Request timeout');
      (mockError as any).isAxiosError = true;
      (mockError as any).code = 'ECONNABORTED';

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(scraper.fetchAndParse('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle DNS resolution errors', async () => {
      const mockError = new Error('getaddrinfo ENOTFOUND example.com');
      (mockError as any).isAxiosError = true;
      (mockError as any).code = 'ENOTFOUND';

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(scraper.fetchAndParse('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle connection refused errors', async () => {
      const mockError = new Error('ECONNREFUSED');
      (mockError as any).isAxiosError = true;
      (mockError as any).code = 'ECONNREFUSED';

      mockedAxios.get.mockRejectedValueOnce(mockError);

      await expect(scraper.fetchAndParse('https://example.com')).rejects.toThrow(HttpClientError);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Tests for edge cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty HTML', async () => {
      const mockHtml = '';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($).toBeDefined();
      expect($('body').length).toBe(0);
    });

    it('should handle very long HTML', async () => {
      const longText = 'a'.repeat(1000000);
      const mockHtml = `<div>${longText}</div>`;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('div').text()).toBe(longText);
    });

    it('should handle deeply nested HTML', async () => {
      let html = '<div class="level-0">';
      for (let i = 1; i <= 100; i++) {
        html += `<div class="level-${i}">`;
      }
      html += 'Deep Content';
      for (let i = 100; i >= 1; i--) {
        html += '</div>';
      }
      html += '</div>';

      const mockResponse = {
        data: html,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.level-50').length).toBe(1);
      expect($('.level-100').text()).toBe('Deep Content');
    });

    it('should handle HTML with duplicate IDs', async () => {
      const mockHtml = `
        <div id="test">First</div>
        <div id="test">Second</div>
      `;
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('#test').length).toBe(2);
    });

    it('should handle HTML with invalid attributes', async () => {
      const mockHtml = '<div class="test" invalid-attr="value">Content</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('.test').text()).toBe('Content');
    });

    it('should handle HTML with missing quotes around attributes', async () => {
      const mockHtml = '<div class=test id=main>Content</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('div').attr('class')).toBe('test');
      expect($('div').attr('id')).toBe('main');
    });

    it('should handle HTML with nested quotes in attributes', async () => {
      const mockHtml = '<div data-json=\'{"key": "value"}\'>Content</div>';
      const mockResponse = {
        data: mockHtml,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const $ = await scraper.fetchAndParse('https://example.com');

      expect($('div').attr('data-json')).toBe('{"key": "value"}');
    });
  });
});
