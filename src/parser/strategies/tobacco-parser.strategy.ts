import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Tobacco } from '../../tobaccos/tobaccos.entity';

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
};

@Injectable()
export class TobaccoParserStrategy {
  private readonly logger = new Logger(TobaccoParserStrategy.name);
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    this.logger.log('Initializing Playwright browser...');
    this.browser = await chromium.launch({
      headless: true,
    });
    this.context = await this.browser.newContext();
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
    }

    return limit ? allTobaccos.slice(0, limit) : allTobaccos;
  }

  /**
   * Extract tobacco URLs from line detail page
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
    await this.page.goto(fullUrl, { waitUntil: 'networkidle' });

    // Wait for page to be fully loaded
    await this.page.waitForLoadState('domcontentloaded');

    // Handle infinite scroll
    const tobaccoUrls = new Set<string>();
    let previousCount = 0;
    let noNewContentCount = 0;
    const maxNoNewContent = 5;
    const maxScrollAttempts = 10;
    let scrollAttempts = 0;

    while (
      noNewContentCount < maxNoNewContent &&
      scrollAttempts < maxScrollAttempts
    ) {
      scrollAttempts++;

      // Scroll gradually to trigger infinite scroll
      await this.page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await this.page.waitForTimeout(1000);

      // Extract tobacco URLs
      const urls = await this.page.evaluate(() => {
        const urls: string[] = [];

        // Find all tobacco links in "Вкусы" section
        // Look for links that match pattern: /tobaccos/{brand}/{line}/{tobacco}
        const allLinks = Array.from(document.querySelectorAll('a'));

        console.log('Total links on page:', allLinks.length);

        for (const link of allLinks) {
          const href = link.getAttribute('href');
          if (!href) continue;

          // Match pattern: /tobaccos/{brand}/{line}/{tobacco}
          // Works for both absolute (https://...) and relative (/tobaccos/...) URLs
          const match = href.match(/\/tobaccos\/([^/]+)\/([^/]+)\/([^/?#]+)/);
          if (match) {
            // Convert to absolute URL for consistency
            const absoluteUrl = href.startsWith('http')
              ? href
              : `https://htreviews.org${href}`;
            urls.push(absoluteUrl);
          }
        }

        console.log('Found matching URLs:', urls.length);
        console.log('Sample URLs:', urls.slice(0, 5));

        return urls;
      });

      // Filter to only include tobaccos from this line
      const filteredUrls = urls.filter((url) => {
        const match = url.match(/\/tobaccos\/([^/]+)\/([^/]+)\/([^/?#]+)/);
        if (!match) return false;
        const [, brand, line] = match;
        return line === lineInfo.lineSlug && brand === lineInfo.brandSlug;
      });

      // Add new URLs to set (deduplicates automatically)
      let addedCount = 0;
      for (const url of filteredUrls) {
        if (!tobaccoUrls.has(url)) {
          tobaccoUrls.add(url);
          addedCount++;
        }
      }

      this.logger.debug(
        `Scroll iteration ${scrollAttempts}: added ${addedCount} new URLs, total ${tobaccoUrls.size}`,
      );

      // Check if new content was loaded
      const currentCount = tobaccoUrls.size;
      if (currentCount === previousCount) {
        noNewContentCount++;
      } else {
        noNewContentCount = 0;
        previousCount = currentCount;
      }
    }

    this.logger.debug(
      `Final count for line ${lineInfo.lineSlug}: ${tobaccoUrls.size} tobacco URLs`,
    );

    return Array.from(tobaccoUrls);
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

    await this.page.goto(fullUrl, { waitUntil: 'networkidle' });

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

      // Extract status: look for "Статус" label
      let status = '';
      const statusLabel = allElements.find((el) => {
        const text = el.textContent?.trim() || '';
        return text === 'Статус';
      });
      if (statusLabel) {
        const labelContainer = statusLabel.parentElement;
        if (labelContainer) {
          const parentContainer = labelContainer.parentElement;
          if (parentContainer) {
            const valueDiv = Array.from(parentContainer.children).find(
              (child) => {
                const text = child.textContent?.trim() || '';
                const statusValues = [
                  'Выпускается',
                  'Лимитированная',
                  'Снята с производства',
                ];
                return statusValues.includes(text);
              },
            );
            if (valueDiv) {
              status = valueDiv.textContent?.trim() || '';
            }
          }
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
      };
    });

    this.logger.debug(
      `Extracted tobacco data: ` +
        `name=${tobaccoData.name}, ` +
        `rating=${tobaccoData.rating}, ` +
        `ratingsCount=${tobaccoData.ratingsCount}, ` +
        `htreviewsId=${tobaccoData.htreviewsId}`,
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
