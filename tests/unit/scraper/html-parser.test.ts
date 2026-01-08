/**
 * Unit tests for HTML Parser
 * 
 * Tests HTML parsing functionality including:
 * - Parsing HTML strings with Cheerio
 * - Handling malformed HTML
 * - Extracting elements and attributes
 * - Error handling
 */

import * as cheerio from 'cheerio';
import { parseHtml } from '../../src/scraper';

// ============================================================================
// Test Suite
// ============================================================================

describe('HTML Parser', () => {
  // ============================================================================
  // Tests for parseHtml function
  // ============================================================================

  describe('parseHtml', () => {
    it('should parse valid HTML string', () => {
      const html = '<div class="test">Hello World</div>';
      const $ = parseHtml(html);
      
      expect($).toBeDefined();
      expect($('.test').text()).toBe('Hello World');
    });

    it('should parse HTML with multiple elements', () => {
      const html = `
        <div class="container">
          <h1>Title</h1>
          <p>Paragraph</p>
          <span>Span</span>
        </div>
      `;
      const $ = parseHtml(html);
      
      expect($('h1').text()).toBe('Title');
      expect($('p').text()).toBe('Paragraph');
      expect($('span').text()).toBe('Span');
    });

    it('should parse HTML with nested elements', () => {
      const html = `
        <div class="outer">
          <div class="inner">
            <span>Nested</span>
          </div>
        </div>
      `;
      const $ = parseHtml(html);
      
      expect($('.outer .inner span').text()).toBe('Nested');
    });

    it('should parse HTML with attributes', () => {
      const html = `
        <div class="test" id="main" data-value="123">
          Content
        </div>
      `;
      const $ = parseHtml(html);
      
      expect($('.test').attr('id')).toBe('main');
      expect($('.test').attr('data-value')).toBe('123');
    });

    it('should parse HTML with special characters', () => {
      const html = '<div>Special chars: < > & " '</div>';
      const $ = parseHtml(html);
      
      expect($('div').text()).toBe('Special chars: < > & " \'');
    });

    it('should parse HTML with Unicode characters', () => {
      const html = '<div>Русский текст: Привет мир!</div>';
      const $ = parseHtml(html);
      
      expect($('div').text()).toBe('Русский текст: Привет мир!');
    });

    it('should parse HTML with empty elements', () => {
      const html = `
        <div></div>
        <span></span>
        <p></p>
      `;
      const $ = parseHtml(html);
      
      expect($('div').text()).toBe('');
      expect($('span').text()).toBe('');
      expect($('p').text()).toBe('');
    });

    it('should parse HTML with self-closing tags', () => {
      const html = `
        <div>
          <img src="test.jpg" alt="Test" />
          <br />
          <hr />
        </div>
      `;
      const $ = parseHtml(html);
      
      expect($('img').attr('src')).toBe('test.jpg');
      expect($('img').attr('alt')).toBe('Test');
      expect($('br').length).toBe(1);
      expect($('hr').length).toBe(1);
    });

    it('should parse HTML with comments', () => {
      const html = `
        <div>
          <!-- This is a comment -->
          <span>Content</span>
        </div>
      `;
      const $ = parseHtml(html);
      
      expect($('span').text()).toBe('Content');
    });

    it('should parse HTML with CDATA sections', () => {
      const html = `
        <div>
          <![CDATA[This is CDATA content]]>
          <span>Content</span>
        </div>
      `;
      const $ = parseHtml(html);
      
      expect($('span').text()).toBe('Content');
    });
  });

  // ============================================================================
  // Tests for malformed HTML handling
  // ============================================================================

  describe('Malformed HTML', () => {
    it('should handle unclosed tags', () => {
      const html = '<div><span>Content</div>';
      const $ = parseHtml(html);
      
      expect($('div').text()).toBe('Content');
    });

    it('should handle missing closing tags', () => {
      const html = '<div><span>Content</span>';
      const $ = parseHtml(html);
      
      expect($('span').text()).toBe('Content');
    });

    it('should handle mismatched tags', () => {
      const html = '<div><span>Content</div></span>';
      const $ = parseHtml(html);
      
      expect($('div').text()).toBe('Content');
    });

    it('should handle duplicate IDs', () => {
      const html = `
        <div id="test">First</div>
        <div id="test">Second</div>
      `;
      const $ = parseHtml(html);
      
      expect($('#test').length).toBe(2);
    });

    it('should handle invalid attributes', () => {
      const html = '<div class="test" invalid-attr="value">Content</div>';
      const $ = parseHtml(html);
      
      expect($('.test').text()).toBe('Content');
    });

    it('should handle missing quotes around attributes', () => {
      const html = '<div class=test id=main>Content</div>';
      const $ = parseHtml(html);
      
      expect($('div').attr('class')).toBe('test');
      expect($('div').attr('id')).toBe('main');
    });

    it('should handle nested quotes in attributes', () => {
      const html = '<div data-json=\'{"key": "value"}\'>Content</div>';
      const $ = parseHtml(html);
      
      expect($('div').attr('data-json')).toBe('{"key": "value"}');
    });
  });

  // ============================================================================
  // Tests for Cheerio API compatibility
  // ============================================================================

  describe('Cheerio API', () => {
    it('should support selector queries', () => {
      const html = `
        <div class="container">
          <div class="item">Item 1</div>
          <div class="item">Item 2</div>
          <div class="item">Item 3</div>
        </div>
      `;
      const $ = parseHtml(html);
      
      expect($('.item').length).toBe(3);
      expect($('.item').eq(0).text()).toBe('Item 1');
      expect($('.item').eq(1).text()).toBe('Item 2');
      expect($('.item').eq(2).text()).toBe('Item 3');
    });

    it('should support attribute selectors', () => {
      const html = `
        <div data-id="1">First</div>
        <div data-id="2">Second</div>
        <div data-id="3">Third</div>
      `;
      const $ = parseHtml(html);
      
      expect($('[data-id="2"]').text()).toBe('Second');
    });

    it('should support class selectors', () => {
      const html = `
        <div class="test primary">Primary</div>
        <div class="test secondary">Secondary</div>
        <div class="test tertiary">Tertiary</div>
      `;
      const $ = parseHtml(html);
      
      expect($('.test').length).toBe(3);
      expect($('.primary').text()).toBe('Primary');
      expect($('.secondary').text()).toBe('Secondary');
      expect($('.tertiary').text()).toBe('Tertiary');
    });

    it('should support ID selectors', () => {
      const html = `
        <div id="main">Main</div>
        <div id="content">Content</div>
        <div id="footer">Footer</div>
      `;
      const $ = parseHtml(html);
      
      expect($('#main').text()).toBe('Main');
      expect($('#content').text()).toBe('Content');
      expect($('#footer').text()).toBe('Footer');
    });

    it('should support descendant selectors', () => {
      const html = `
        <div class="container">
          <div class="wrapper">
            <span class="text">Nested Text</span>
          </div>
        </div>
      `;
      const $ = parseHtml(html);
      
      expect($('.container .wrapper .text').text()).toBe('Nested Text');
    });

    it('should support child selectors', () => {
      const html = `
        <div class="container">
          <span class="text">Direct Child</span>
          <div class="wrapper">
            <span class="text">Nested Child</span>
          </div>
        </div>
      `;
      const $ = parseHtml(html);
      
      expect($('.container > .text').text()).toBe('Direct Child');
    });

    it('should support multiple selectors', () => {
      const html = `
        <div class="primary">Primary</div>
        <span class="secondary">Secondary</span>
        <div class="tertiary">Tertiary</div>
      `;
      const $ = parseHtml(html);
      
      expect($('.primary, .secondary').length).toBe(2);
    });

    it('should support pseudo-selectors', () => {
      const html = `
        <ul>
          <li>First</li>
          <li>Second</li>
          <li>Third</li>
        </ul>
      `;
      const $ = parseHtml(html);
      
      expect($('li:first').text()).toBe('First');
      expect($('li:last').text()).toBe('Third');
      expect($('li:nth-child(2)').text()).toBe('Second');
    });

    it('should support each() method', () => {
      const html = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
      const $ = parseHtml(html);
      
      const items: string[] = [];
      $('.item').each((i, el) => {
        items.push($(el).text());
      });
      
      expect(items).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('should support map() method', () => {
      const html = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
      const $ = parseHtml(html);
      
      const items = $('.item').map((i, el) => $(el).text()).get();
      
      expect(items).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('should support filter() method', () => {
      const html = `
        <div class="item active">Active 1</div>
        <div class="item">Inactive</div>
        <div class="item active">Active 2</div>
      `;
      const $ = parseHtml(html);
      
      const activeItems = $('.item').filter('.active');
      
      expect(activeItems.length).toBe(2);
      expect(activeItems.eq(0).text()).toBe('Active 1');
      expect(activeItems.eq(1).text()).toBe('Active 2');
    });

    it('should support find() method', () => {
      const html = `
        <div class="container">
          <div class="wrapper">
            <span class="text">Text 1</span>
          </div>
          <div class="wrapper">
            <span class="text">Text 2</span>
          </div>
        </div>
      `;
      const $ = parseHtml(html);
      
      const container = $('.container');
      const texts = container.find('.text');
      
      expect(texts.length).toBe(2);
      expect(texts.eq(0).text()).toBe('Text 1');
      expect(texts.eq(1).text()).toBe('Text 2');
    });

    it('should support parent() method', () => {
      const html = `
        <div class="container">
          <div class="wrapper">
            <span class="text">Text</span>
          </div>
        </div>
      `;
      const $ = parseHtml(html);
      
      const text = $('.text');
      const wrapper = text.parent();
      const container = text.parent().parent();
      
      expect(wrapper.hasClass('wrapper')).toBe(true);
      expect(container.hasClass('container')).toBe(true);
    });

    it('should support children() method', () => {
      const html = `
        <div class="container">
          <span>Child 1</span>
          <span>Child 2</span>
          <span>Child 3</span>
        </div>
      `;
      const $ = parseHtml(html);
      
      const children = $('.container').children();
      
      expect(children.length).toBe(3);
      expect(children.eq(0).text()).toBe('Child 1');
      expect(children.eq(1).text()).toBe('Child 2');
      expect(children.eq(2).text()).toBe('Child 3');
    });

    it('should support siblings() method', () => {
      const html = `
        <div>
          <span class="prev">Previous</span>
          <span class="current">Current</span>
          <span class="next">Next</span>
        </div>
      `;
      const $ = parseHtml(html);
      
      const siblings = $('.current').siblings();
      
      expect(siblings.length).toBe(2);
      expect(siblings.eq(0).hasClass('prev')).toBe(true);
      expect(siblings.eq(1).hasClass('next')).toBe(true);
    });

    it('should support next() method', () => {
      const html = `
        <div>
          <span class="first">First</span>
          <span class="second">Second</span>
          <span class="third">Third</span>
        </div>
      `;
      const $ = parseHtml(html);
      
      const second = $('.first').next();
      const third = $('.first').next().next();
      
      expect(second.hasClass('second')).toBe(true);
      expect(third.hasClass('third')).toBe(true);
    });

    it('should support prev() method', () => {
      const html = `
        <div>
          <span class="first">First</span>
          <span class="second">Second</span>
          <span class="third">Third</span>
        </div>
      `;
      const $ = parseHtml(html);
      
      const second = $('.third').prev();
      const first = $('.third').prev().prev();
      
      expect(second.hasClass('second')).toBe(true);
      expect(first.hasClass('first')).toBe(true);
    });

    it('should support addClass() method', () => {
      const html = '<div class="test">Content</div>';
      const $ = parseHtml(html);
      
      $('.test').addClass('active');
      
      expect($('.test').hasClass('active')).toBe(true);
    });

    it('should support removeClass() method', () => {
      const html = '<div class="test active">Content</div>';
      const $ = parseHtml(html);
      
      $('.test').removeClass('active');
      
      expect($('.test').hasClass('active')).toBe(false);
    });

    it('should support toggleClass() method', () => {
      const html = '<div class="test">Content</div>';
      const $ = parseHtml(html);
      
      $('.test').toggleClass('active');
      expect($('.test').hasClass('active')).toBe(true);
      
      $('.test').toggleClass('active');
      expect($('.test').hasClass('active')).toBe(false);
    });

    it('should support attr() method', () => {
      const html = '<div class="test" id="main" data-value="123">Content</div>';
      const $ = parseHtml(html);
      
      expect($('.test').attr('id')).toBe('main');
      expect($('.test').attr('data-value')).toBe('123');
    });

    it('should support data() method', () => {
      const html = '<div class="test" data-id="123" data-name="test">Content</div>';
      const $ = parseHtml(html);
      
      expect($('.test').data('id')).toBe('123');
      expect($('.test').data('name')).toBe('test');
    });

    it('should support val() method', () => {
      const html = '<input type="text" value="test value" />';
      const $ = parseHtml(html);
      
      expect($('input').val()).toBe('test value');
    });

    it('should support text() method', () => {
      const html = '<div class="test">Text content</div>';
      const $ = parseHtml(html);
      
      expect($('.test').text()).toBe('Text content');
    });

    it('should support html() method', () => {
      const html = '<div class="test"><span>Nested</span></div>';
      const $ = parseHtml(html);
      
      expect($('.test').html()).toBe('<span>Nested</span>');
    });

    it('should support is() method', () => {
      const html = '<div class="test active">Content</div>';
      const $ = parseHtml(html);
      
      expect($('.test').is('.active')).toBe(true);
      expect($('.test').is('.inactive')).toBe(false);
    });

    it('should support has() method', () => {
      const html = `
        <div class="container">
          <div class="wrapper">
            <span class="text">Text</span>
          </div>
        </div>
      `;
      const $ = parseHtml(html);
      
      expect($('.container').has('.text').length).toBe(1);
      expect($('.container').has('.missing').length).toBe(0);
    });

    it('should support index() method', () => {
      const html = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
      const $ = parseHtml(html);
      
      const items = $('.item');
      expect(items.index(items.eq(0))).toBe(0);
      expect(items.index(items.eq(1))).toBe(1);
      expect(items.index(items.eq(2))).toBe(2);
    });

    it('should support length property', () => {
      const html = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
      const $ = parseHtml(html);
      
      expect($('.item').length).toBe(3);
    });

    it('should support eq() method', () => {
      const html = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
      const $ = parseHtml(html);
      
      expect($('.item').eq(0).text()).toBe('Item 1');
      expect($('.item').eq(1).text()).toBe('Item 2');
      expect($('.item').eq(2).text()).toBe('Item 3');
    });

    it('should support first() method', () => {
      const html = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
      const $ = parseHtml(html);
      
      expect($('.item').first().text()).toBe('Item 1');
    });

    it('should support last() method', () => {
      const html = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
      const $ = parseHtml(html);
      
      expect($('.item').last().text()).toBe('Item 3');
    });
  });

  // ============================================================================
  // Tests for error handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle empty HTML string', () => {
      const html = '';
      const $ = parseHtml(html);
      
      expect($).toBeDefined();
      expect($('body').length).toBe(0);
    });

    it('should handle null input', () => {
      const $ = parseHtml(null as any);
      
      expect($).toBeDefined();
    });

    it('should handle undefined input', () => {
      const $ = parseHtml(undefined as any);
      
      expect($).toBeDefined();
    });

    it('should handle non-string input', () => {
      const $ = parseHtml(123 as any);
      
      expect($).toBeDefined();
    });

    it('should handle extremely long HTML', () => {
      const longText = 'a'.repeat(1000000);
      const html = `<div>${longText}</div>`;
      const $ = parseHtml(html);
      
      expect($('div').text()).toBe(longText);
    });

    it('should handle deeply nested HTML', () => {
      let html = '<div class="level-0">';
      for (let i = 1; i <= 100; i++) {
        html += `<div class="level-${i}">`;
      }
      html += 'Deep Content';
      for (let i = 100; i >= 1; i--) {
        html += '</div>';
      }
      html += '</div>';
      
      const $ = parseHtml(html);
      
      expect($('.level-50').length).toBe(1);
      expect($('.level-100').text()).toBe('Deep Content');
    });
  });

  // ============================================================================
  // Tests for real-world HTML patterns
  // ============================================================================

  describe('Real-world HTML Patterns', () => {
    it('should parse HTML table', () => {
      const html = `
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>City</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John</td>
              <td>30</td>
              <td>New York</td>
            </tr>
            <tr>
              <td>Jane</td>
              <td>25</td>
              <td>London</td>
            </tr>
          </tbody>
        </table>
      `;
      const $ = parseHtml(html);
      
      expect($('thead th').length).toBe(3);
      expect($('tbody tr').length).toBe(2);
      expect($('tbody tr:first td:first').text()).toBe('John');
    });

    it('should parse HTML form', () => {
      const html = `
        <form id="test-form">
          <input type="text" name="username" value="testuser" />
          <input type="password" name="password" value="testpass" />
          <select name="country">
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
          </select>
          <textarea name="message">Test message</textarea>
        </form>
      `;
      const $ = parseHtml(html);
      
      expect($('input[name="username"]').val()).toBe('testuser');
      expect($('input[name="password"]').val()).toBe('testpass');
      expect($('select[name="country"]').val()).toBe('us');
      expect($('textarea[name="message"]').val()).toBe('Test message');
    });

    it('should parse HTML list', () => {
      const html = `
        <ul class="items">
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
      `;
      const $ = parseHtml(html);
      
      expect($('.items li').length).toBe(3);
      expect($('.items li:first').text()).toBe('Item 1');
      expect($('.items li:last').text()).toBe('Item 3');
    });

    it('should parse HTML with inline styles', () => {
      const html = '<div style="color: red; font-size: 16px;">Styled Content</div>';
      const $ = parseHtml(html);
      
      expect($('div').attr('style')).toBe('color: red; font-size: 16px;');
    });

    it('should parse HTML with data attributes', () => {
      const html = `
        <div class="item" data-id="123" data-name="Test" data-active="true">
          Content
        </div>
      `;
      const $ = parseHtml(html);
      
      expect($('.item').data('id')).toBe('123');
      expect($('.item').data('name')).toBe('Test');
      expect($('.item').data('active')).toBe('true');
    });

    it('should parse HTML with ARIA attributes', () => {
      const html = `
        <button aria-label="Close" aria-pressed="false">
          Close
        </button>
      `;
      const $ = parseHtml(html);
      
      expect($('button').attr('aria-label')).toBe('Close');
      expect($('button').attr('aria-pressed')).toBe('false');
    });

    it('should parse HTML with SVG', () => {
      const html = `
        <svg width="100" height="100">
          <circle cx="50" cy="50" r="40" fill="red" />
        </svg>
      `;
      const $ = parseHtml(html);
      
      expect($('svg').length).toBe(1);
      expect($('circle').length).toBe(1);
      expect($('circle').attr('cx')).toBe('50');
      expect($('circle').attr('cy')).toBe('50');
      expect($('circle').attr('r')).toBe('40');
    });
  });
});
