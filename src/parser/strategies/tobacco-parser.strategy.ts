import { Injectable, Logger } from '@nestjs/common';
import type { Browser, Page, BrowserContext } from 'playwright';
import { Tobacco } from '../../tobaccos/tobaccos.entity';
import { createBrowser, createContext } from '../browser/browser.config';
import { navigateWithCheck } from '../browser/http-checker';
import {
  loadAllItems,
  type ItemLoadResult,
  type ItemLoaderOptions,
} from '../browser/item-loader';

export type TobaccoUrlInfo = {
  url: string;
  lineId: string;
  brandId: string;
  brandSlug: string;
  lineSlug: string;
};

export type ParsedTobaccoData = {
  name: string;
  slug: string;
  brandId: string;
  lineId: string | null;
  rating: number;
  ratingsCount: number;
  strengthOfficial: string | null;
  strengthByRatings: string | null;
  status: string | null;
  htreviewsId: string;
  imageUrl: string | null;
  description: string | null;
  flavors: string[];
};

@Injectable()
export class TobaccoParserStrategy {
  private readonly logger = new Logger(TobaccoParserStrategy.name);
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    this.logger.log('Initializing Playwright browser...');
    this.browser = await createBrowser();
    this.context = await createContext(this.browser);
    this.page = await this.context.newPage();
    this.logger.log('Playwright browser initialized');
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
    this.logger.log('Playwright browser closed');
  }

  /**
   * Navigate to URL with HTTP status verification.
   * Uses navigateWithCheck for goto + status check + retry on 429.
   * @param url - URL to navigate to (absolute or relative to htreviews.org)
   */
  private async safeNavigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const fullUrl = url.startsWith('http')
      ? url
      : `https://htreviews.org${url}`;

    this.logger.debug(`Navigating to ${fullUrl}`);

    const result = await navigateWithCheck(this.page, fullUrl);

    if (!result.ok) {
      throw new Error(
        `Navigation failed for ${fullUrl}: HTTP ${result.status}`,
      );
    }

    // Wait for DOM content after successful navigation
    await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Wait for main content to appear
    await this.page.waitForSelector('h1', { timeout: 10000 });

    this.logger.debug(`Successfully navigated to ${fullUrl}`);
  }

  async parseTobaccos(
    lineUrls: TobaccoUrlInfo[],
    limit?: number,
  ): Promise<ParsedTobaccoData[]> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const allTobaccos: ParsedTobaccoData[] = [];

    for (let i = 0; i < lineUrls.length; i++) {
      const lineInfo = lineUrls[i];

      // Check if we've reached limit
      if (limit && allTobaccos.length >= limit) {
        this.logger.log(`Reached limit of ${limit} tobaccos`);
        break;
      }

      try {
        this.logger.log(
          `Parsing tobaccos for line ${i + 1}/${lineUrls.length}: ${lineInfo.lineSlug}`,
        );

        // Extract tobacco URLs from line page
        const tobaccoUrls = await this.extractTobaccoUrlsFromLinePage(lineInfo);
        this.logger.log(`Found ${tobaccoUrls.length} tobaccos on line page`);

        // Parse each tobacco detail page
        for (const tobaccoUrl of tobaccoUrls) {
          // Check limit again
          if (limit && allTobaccos.length >= limit) {
            this.logger.log(`Reached limit of ${limit} tobaccos`);
            break;
          }

          try {
            const tobaccoData = await this.parseTobaccoDetailPage(
              tobaccoUrl,
              lineInfo.brandId,
              lineInfo.lineId,
            );
            allTobaccos.push(tobaccoData);
            this.logger.log(`Parsed tobacco: ${tobaccoData.name}`);
          } catch (error) {
            this.logger.warn(
              `Failed to parse tobacco ${tobaccoUrl}: ${error instanceof Error ? error.message : String(error)}`,
            );
            // Continue with next tobacco
          }

          // Add delay between tobacco page navigations to prevent race conditions
          await this.page.waitForTimeout(300);
        }

        // Break outer loop if limit reached
        if (limit && allTobaccos.length >= limit) {
          break;
        }
      } catch (error) {
        this.logger.error(
          `Failed to parse tobaccos from line ${lineInfo.lineSlug}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue with next line on error
      }

      // Add delay between line page navigations to prevent race conditions
      await this.page.waitForTimeout(500);
    }

    return limit ? allTobaccos.slice(0, limit) : allTobaccos;
  }

  /**
   * Extract tobacco URLs from line detail page using HTMX direct loading
   * with scroll fallback.
   */
  private async extractTobaccoUrlsFromLinePage(
    lineInfo: TobaccoUrlInfo,
  ): Promise<string[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const fullUrl = lineInfo.url.startsWith('http')
      ? lineInfo.url
      : `https://htreviews.org${lineInfo.url}`;

    this.logger.debug(`Navigating to: ${fullUrl}`);
    await this.safeNavigate(fullUrl);

    const options: ItemLoaderOptions = {
      containerSelector: '.tobacco_list_items',
      itemSelector: '.tobacco_list_item',
      baseUrl: 'https://htreviews.org',
      maxScrollAttempts: 100,
      maxNoNewContent: 15,
      waitForNewItemMs: 2000,
    };

    const result: ItemLoadResult = await loadAllItems(this.page, options);

    this.logger.log(`Loaded tobaccos via ${result.method} for ${fullUrl}`);

    if (!result.isComplete) {
      this.logger.warn(
        `Loaded ${result.loadedCount} of ${result.totalCount} tobaccos for ${fullUrl}`,
      );
    }

    // Filter URLs by brand/line slug prefix
    const filteredUrls = result.urls.filter((url) => {
      const match = url.match(/\/tobaccos\/([^/]+)\/([^/]+)\/([^/?#]+)/);
      if (!match) return false;
      const [, brand, line] = match;
      return line === lineInfo.lineSlug && brand === lineInfo.brandSlug;
    });

    this.logger.debug(
      `Filtered to ${filteredUrls.length} URLs for line ${lineInfo.lineSlug}`,
    );

    return filteredUrls;
  }

  /**
   * Parse tobacco detail page to extract all fields
   */
  private async parseTobaccoDetailPage(
    url: string,
    brandId: string,
    lineId: string,
  ): Promise<ParsedTobaccoData> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const fullUrl = url.startsWith('http')
      ? url
      : `https://htreviews.org${url}`;
    this.logger.debug(`Parsing tobacco detail page: ${fullUrl}`);

    // Extract slug from URL
    // URL pattern: https://htreviews.org/tobaccos/{brand-slug}/{line-slug}/{tobacco-slug}
    const slugMatch = fullUrl.match(/\/tobaccos\/[^/]+\/[^/]+\/([^/?#]+)/);
    const slug = slugMatch ? slugMatch[1] : '';

    await this.safeNavigate(fullUrl);

    const tobaccoData = await this.page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));

      // Extract name from H1 heading
      const headingElement = document.querySelector('h1');
      const name = headingElement?.textContent?.trim() || '';

      // Extract imageUrl: first image in main
      let imageUrl = '';
      const mainElement = document.querySelector('main');
      if (mainElement) {
        const imageElement = mainElement.querySelector('img');
        if (imageElement) {
          imageUrl = imageElement.getAttribute('src') || '';
        }
      }

      // Extract description: text after name, before brand/line info
      let description = '';
      // Description is in a div with class "object_card_discr"
      const descriptionElement = document.querySelector('.object_card_discr');
      if (descriptionElement) {
        description = descriptionElement.textContent?.trim() || '';
      }

      // Extract strengthOfficial: look for "Крепость официальная" label
      let strengthOfficial = '';
      const strengthOfficialLabel = allElements.find((el) => {
        const text = el.textContent?.trim() || '';
        return text === 'Крепость официальная';
      });
      if (strengthOfficialLabel) {
        const labelContainer = strengthOfficialLabel.parentElement;
        if (labelContainer) {
          const parentContainer = labelContainer.parentElement;
          if (parentContainer) {
            const valueDiv = Array.from(parentContainer.children).find(
              (child) => {
                const text = child.textContent?.trim() || '';
                const strengthValues = [
                  'Лёгкая',
                  'Средне-лёгкая',
                  'Средняя',
                  'Средне-крепкая',
                  'Крепкая',
                  'Не указано',
                ];
                return strengthValues.includes(text);
              },
            );
            if (valueDiv) {
              strengthOfficial = valueDiv.textContent?.trim() || '';
            }
          }
        }
      }

      // Extract strengthByRatings: look for "Крепость по оценкам" label
      let strengthByRatings = '';
      const strengthByRatingsLabel = allElements.find((el) => {
        const text = el.textContent?.trim() || '';
        return text === 'Крепость по оценкам';
      });
      if (strengthByRatingsLabel) {
        const labelContainer = strengthByRatingsLabel.parentElement;
        if (labelContainer) {
          const parentContainer = labelContainer.parentElement;
          if (parentContainer) {
            const valueDiv = Array.from(parentContainer.children).find(
              (child) => {
                const text = child.textContent?.trim() || '';
                const strengthValues = [
                  'Лёгкая',
                  'Средне-лёгкая',
                  'Средняя',
                  'Средне-крепкая',
                  'Крепкая',
                  'Не указано',
                  'Мало оценок',
                ];
                return strengthValues.includes(text);
              },
            );
            if (valueDiv) {
              strengthByRatings = valueDiv.textContent?.trim() || '';
            }
          }
        }
      }

      // Extract status: look for object_info_item with "Статус" label
      let status = '';
      const infoItems = document.querySelectorAll('.object_info_item');
      for (const item of infoItems) {
        const spans = Array.from(item.querySelectorAll('span'));
        const labelSpan = spans.find(
          (span) => span.textContent?.trim() === 'Статус',
        );
        const valueSpan = spans[spans.length - 1];
        if (
          labelSpan &&
          valueSpan &&
          valueSpan !== labelSpan &&
          valueSpan.textContent?.trim()
        ) {
          status = valueSpan.textContent.trim();
          break;
        }
      }

      // Extract htreviewsId: look for "HtreviewsID" label
      let htreviewsId = '';
      const htreviewsIdLabel = allElements.find((el) => {
        const text = el.textContent?.trim() || '';
        return text === 'HtreviewsID';
      });
      if (htreviewsIdLabel) {
        const idContainer = htreviewsIdLabel.parentElement;
        if (idContainer) {
          const valueDiv = Array.from(idContainer.children).find((child) => {
            const text = child.textContent?.trim() || '';
            // Match pattern: htr followed by numbers
            return /^htr\d+$/.test(text);
          });
          if (valueDiv) {
            htreviewsId = valueDiv.textContent?.trim() || '';
          }
        }
      }

      // Extract flavors: find all links with "r=flavor" in href
      const flavors: string[] = [];
      const allLinks = Array.from(document.querySelectorAll('a'));
      for (const link of allLinks) {
        const href = link.getAttribute('href') || '';
        if (href.includes('r=flavor')) {
          const flavorName = link.textContent?.trim();
          if (flavorName && !flavors.includes(flavorName)) {
            flavors.push(flavorName);
          }
        }
      }

      // Extract rating and ratingsCount from rating box
      let rating = 0;
      let ratingsCount = 0;

      // Find rating box in object_stats section
      // Structure:
      //   - div[data-rating="4.8"] contains rating value
      //   - div[data-stats="1"] contains 3 stats (ratings, reviews, views)
      const ratingDiv = document.querySelector('div[data-rating]');
      if (ratingDiv) {
        const ratingValue = ratingDiv.getAttribute('data-rating');
        if (ratingValue) {
          rating = parseFloat(ratingValue);
        }
      }

      // Find ratings count in stats section
      const statsDiv = document.querySelector('div[data-stats]');
      if (statsDiv) {
        // First child is ratings count (Оценки)
        const firstStat = statsDiv.firstElementChild;
        if (firstStat) {
          const ratingsText =
            firstStat.querySelector('span')?.textContent?.trim() || '';
          ratingsCount = parseInt(ratingsText, 10);
        }
      }

      return {
        name,
        imageUrl,
        description,
        strengthOfficial,
        strengthByRatings,
        status,
        htreviewsId,
        rating,
        ratingsCount,
        flavors,
      };
    });

    this.logger.debug(
      `Extracted tobacco data: ` +
        `name=${tobaccoData.name}, ` +
        `rating=${tobaccoData.rating}, ` +
        `ratingsCount=${tobaccoData.ratingsCount}, ` +
        `htreviewsId=${tobaccoData.htreviewsId}, ` +
        `flavors=[${tobaccoData.flavors.join(', ')}]`,
    );

    return {
      name: tobaccoData.name,
      slug,
      brandId,
      lineId,
      rating: tobaccoData.rating || 0,
      ratingsCount: tobaccoData.ratingsCount || 0,
      strengthOfficial: tobaccoData.strengthOfficial || 'Не указано',
      strengthByRatings: tobaccoData.strengthByRatings || 'Не указано',
      status: tobaccoData.status || 'Выпускается',
      htreviewsId: tobaccoData.htreviewsId,
      imageUrl: tobaccoData.imageUrl || '',
      description: tobaccoData.description || '',
      flavors: tobaccoData.flavors || [],
    };
  }

  /**
   * Parse a single tobacco from its detail URL
   * @param url - Tobacco detail URL (e.g., "/tobaccos/dogma/100-sigarnyy-pank/lemon-drops" or "https://htreviews.org/tobaccos/dogma/100-sigarnyy-pank/lemon-drops")
   * @param brandId - Brand ID for tobacco
   * @param lineId - Line ID for tobacco
   * @returns Parsed tobacco data
   */
  async parseTobaccoByUrl(
    url: string,
    brandId: string,
    lineId: string,
  ): Promise<ParsedTobaccoData> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const fullUrl = url.startsWith('http')
      ? url
      : `https://htreviews.org${url}`;

    this.logger.log(`Parsing tobacco from URL: ${fullUrl}`);

    // Parse tobacco detail page
    const tobaccoData = await this.parseTobaccoDetailPage(
      fullUrl,
      brandId,
      lineId,
    );

    return tobaccoData;
  }

  normalizeToEntity(data: ParsedTobaccoData): Partial<Tobacco> {
    return {
      name: data.name,
      slug: data.slug,
      brandId: data.brandId,
      lineId: data.lineId || undefined,
      rating: data.rating,
      ratingsCount: data.ratingsCount,
      strengthOfficial: data.strengthOfficial || 'Не указано',
      strengthByRatings: data.strengthByRatings || 'Не указано',
      status: data.status || 'Выпускается',
      htreviewsId: data.htreviewsId,
      imageUrl: data.imageUrl || '',
      description: data.description || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
