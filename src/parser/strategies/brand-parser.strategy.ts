import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Brand } from '../../brands/brands.entity';

export type ParsedBrandData = {
  name: string;
  slug: string;
  country: string;
  rating: number;
  ratingsCount: number;
  description: string;
  logoUrl: string;
  detailUrl: string;
  status: string;
};

@Injectable()
export class BrandParserStrategy {
  private readonly logger = new Logger(BrandParserStrategy.name);
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

  async parseBrands(limit?: number): Promise<ParsedBrandData[]> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    // Parse both "Best Brands" and "Other Brands" pages
    const bestBrandsUrl = 'https://htreviews.org/tobaccos/brands?r=position&s=rating&d=desc';
    const otherBrandsUrl = 'https://htreviews.org/tobaccos/brands?r=others&s=rating&d=desc';

    this.logger.log('Parsing brands from Best Brands page...');
    const bestBrands = await this.parseBrandList(bestBrandsUrl, limit);
    this.logger.log(`Parsed ${bestBrands.length} brands from Best Brands page`);

    this.logger.log('Parsing brands from Other Brands page...');
    const otherBrands = await this.parseBrandList(otherBrandsUrl, limit);
    this.logger.log(`Parsed ${otherBrands.length} brands from Other Brands page`);

    // Combine and deduplicate by slug
    const allBrandsMap = new Map<string, ParsedBrandData>();

    for (const brand of [...bestBrands, ...otherBrands]) {
      if (!allBrandsMap.has(brand.slug)) {
        allBrandsMap.set(brand.slug, brand);
      }
    }

    const allBrands = Array.from(allBrandsMap.values());
    const duplicateCount = bestBrands.length + otherBrands.length - allBrands.length;
    this.logger.log(
      `Combined ${bestBrands.length} + ${otherBrands.length} brands, found ${duplicateCount} duplicates, total unique: ${allBrands.length}`,
    );

    // Apply limit if specified
    const brandsToProcess = limit ? allBrands.slice(0, limit) : allBrands;

    // Parse detail pages for logoUrl and full description
    this.logger.log('Parsing brand detail pages...');
    for (let i = 0; i < brandsToProcess.length; i++) {
      const brand = brandsToProcess[i];
      try {
        this.logger.log(
          `Parsing detail page for brand ${i + 1}/${brandsToProcess.length}: ${brand.name}`,
        );
        const detailData = await this.parseBrandDetail(brand.detailUrl);
        brandsToProcess[i] = {
          ...brand,
          logoUrl: detailData.logoUrl,
          description: detailData.description,
          status: detailData.status,
        };
      } catch (error) {
        this.logger.error(
          `Failed to parse detail page for ${brand.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue with next brand on error
      }
    }

    return brandsToProcess;
  }

  private async parseBrandList(
    url: string,
    limit?: number,
  ): Promise<ParsedBrandData[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.goto(url, { waitUntil: 'networkidle' });

    const brands: ParsedBrandData[] = [];
    const seenUrls = new Set<string>();
    let previousCount = 0;
    let noNewContentCount = 0;
    const maxNoNewContent = 10;
    let scrollCount = 0;

    while (noNewContentCount < maxNoNewContent) {
      scrollCount++;
      this.logger.log(`Scroll ${scrollCount}: Found ${brands.length} brands so far`);

      // Check if we've reached the limit
      if (limit && brands.length >= limit) {
        this.logger.log(`Reached limit of ${limit} brands`);
        break;
      }

      // Scroll to bottom to trigger infinite scroll
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.page.waitForTimeout(3000);

      // Extract brand items using actual CSS selectors
      const brandItems = await this.page.$$eval(
        '.tobacco_list_item',
        (elements) => {
          return elements.map((element) => {
            const nameElement = element.querySelector(
              '.tobacco_list_item_slug span:first-child',
            );
            const countryElement = element.querySelector(
              '.tobacco_list_item_slug .country',
            );
            const imageElement = element.querySelector(
              '.tobacco_list_item_image img',
            );
            const linkElement = element.querySelector(
              '.tobacco_list_item_slug',
            );

            // Get all div children to find rating, ratings count, and description
            const divs = Array.from(
              element.querySelectorAll(':scope > div > div'),
            );

            // Skip first div (rank/position number) and find rating div
            // Rating must be in range 0-5 to avoid matching ratings count
            const ratingDiv = divs.slice(1).find((div) => {
              const text = div.textContent.trim();
              const match = text.match(/^(\d+(\.\d+)?)$/);
              if (!match) return false;
              const rating = parseFloat(match[1]);
              return rating >= 0 && rating <= 5;
            });

            // Find ratings count div (contains 1-5 digit number)
            // Skip first div (rank) and skip rating div
            const ratingsCountDiv = divs.slice(1).find((div) => {
              const text = div.textContent.trim();
              const match = text.match(/^(\d{1,5})$/);
              if (!match) return false;
              const count = parseInt(match[1], 10);
              // Ratings count should be >= 1 to avoid matching ratings (which are decimals)
              return count >= 1;
            });

            // Find description div (long text with brand/tobacco keywords)
            const descriptionDiv = divs.find((div) => {
              const text = div.textContent.trim();
              return (
                text.length > 50 &&
                (text.includes('табак') || text.includes('бренд'))
              );
            });

            const detailUrl = linkElement?.getAttribute('href') || '';

            // Extract slug from detailUrl (format: /tobaccos/{slug})
            let slug = '';
            if (detailUrl) {
              const urlMatch = detailUrl.match(/\/tobaccos\/([^/?]+)/);
              if (urlMatch) {
                slug = urlMatch[1];
              }
            }

            return {
              name: nameElement?.textContent?.trim() || '',
              slug,
              country: countryElement?.textContent?.trim() || '',
              rating: parseFloat(ratingDiv?.textContent?.trim() || '0'),
              ratingsCount: parseInt(
                ratingsCountDiv?.textContent?.trim() || '0',
                10,
              ),
              detailUrl,
              description: descriptionDiv?.textContent?.trim() || '',
              logoUrl: imageElement?.getAttribute('src') || '',
              status: 'Не указано',
            };
          });
        },
      );

      // Filter out duplicates
      const newBrands = brandItems.filter((brand) => {
        if (seenUrls.has(brand.detailUrl)) {
          return false;
        }
        seenUrls.add(brand.detailUrl);
        return true;
      });

      // Apply limit to new brands
      const remainingLimit = limit ? limit - brands.length : undefined;
      const brandsToAdd = remainingLimit
        ? newBrands.slice(0, remainingLimit)
        : newBrands;

      brands.push(...brandsToAdd);

      // Check if new content was loaded
      const currentCount = brands.length;
      if (currentCount === previousCount) {
        noNewContentCount++;
      } else {
        noNewContentCount = 0;
        previousCount = currentCount;
      }
    }

    return brands;
  }

  private async parseBrandDetail(
    detailUrl: string,
  ): Promise<{
    logoUrl: string;
    description: string;
    status: string;
  }> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const fullUrl = detailUrl.startsWith('http')
      ? detailUrl
      : `https://htreviews.org${detailUrl}`;

    await this.page.goto(fullUrl, { waitUntil: 'networkidle' });

    const data = await this.page.evaluate(() => {
      // Find logo image - look for img in object_image class
      const logoImg = document.querySelector('.object_image img');
      // Find description - look for span in object_card_discr class
      const descriptionElement = document.querySelector(
        '.object_card_discr span',
      );

      // Extract status - look for object_info_item with "Статус" label
      let status = 'Не указано';
      const infoItems = document.querySelectorAll('.object_info_item');
      for (const item of infoItems) {
        const spans = Array.from(item.querySelectorAll('span'));
        // Find the span that contains exactly "Статус" (without the icon)
        const labelSpan = spans.find((span) => span.textContent?.trim() === 'Статус');
        // The status value is in the last span (index 3 in the status item)
        const valueSpan = spans[spans.length - 1];
        if (
          labelSpan &&
          valueSpan?.textContent &&
          valueSpan.textContent.trim() !== ''
        ) {
          status = valueSpan.textContent.trim();
          break;
        }
      }

      return {
        logoUrl: logoImg?.getAttribute('src') || '',
        description: descriptionElement?.textContent?.trim() || '',
        status,
      };
    });

    return data;
  }

  /**
   * Parse a single brand from its detail URL
   * @param url - Brand detail URL (e.g., "/tobaccos/dogma" or "https://htreviews.org/tobaccos/dogma")
   * @returns Parsed brand data
   */
  async parseBrandByUrl(url: string): Promise<ParsedBrandData> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const fullUrl = url.startsWith('http')
      ? url
      : `https://htreviews.org${url}`;

    this.logger.log(`Parsing brand from URL: ${fullUrl}`);

    await this.page.goto(fullUrl, { waitUntil: 'networkidle' });

    // Extract basic brand data from detail page
    const data = await this.page.evaluate(() => {
      // Extract brand name from h1
      const nameElement = document.querySelector('h1');
      const name = nameElement?.textContent?.trim() || '';

      // Extract slug from URL
      const slugMatch = window.location.pathname.match(/\/tobaccos\/([^/?]+)/);
      const slug = slugMatch ? slugMatch[1] : '';

      // Extract country from page
      let country = '';
      const countryElement = document.querySelector('.country');
      if (countryElement) {
        country = countryElement.textContent?.trim() || '';
      }

      // Extract rating
      let rating = 0;
      const ratingDiv = document.querySelector('div[data-rating]');
      if (ratingDiv) {
        const ratingValue = ratingDiv.getAttribute('data-rating');
        if (ratingValue) {
          rating = parseFloat(ratingValue);
        }
      }

      // Extract ratings count
      let ratingsCount = 0;
      const statsDiv = document.querySelector('div[data-stats]');
      if (statsDiv) {
        const firstStat = statsDiv.firstElementChild;
        if (firstStat) {
          const ratingsText = firstStat.querySelector('span')?.textContent?.trim() || '';
          ratingsCount = parseInt(ratingsText, 10);
        }
      }

      // Extract status - look for object_info_item with "Статус" label
      let status = 'Не указано';
      const infoItems = document.querySelectorAll('.object_info_item');
      for (const item of infoItems) {
        const spans = Array.from(item.querySelectorAll('span'));
        // Find the span that contains exactly "Статус" (without the icon)
        const labelSpan = spans.find((span) => span.textContent?.trim() === 'Статус');
        // The status value is in the last span (index 3 in the status item)
        const valueSpan = spans[spans.length - 1];
        if (
          labelSpan &&
          valueSpan?.textContent &&
          valueSpan.textContent.trim() !== ''
        ) {
          status = valueSpan.textContent.trim();
          break;
        }
      }

      return {
        name,
        slug,
        country,
        rating,
        ratingsCount,
        status,
      };
    });

    // Extract logoUrl and description using existing method
    const detailData = await this.parseBrandDetail(url);

    return {
      name: data.name,
      slug: data.slug,
      country: data.country,
      rating: data.rating,
      ratingsCount: data.ratingsCount,
      description: detailData.description,
      logoUrl: detailData.logoUrl,
      detailUrl: url,
      status: data.status,
    };
  }

  normalizeToEntity(data: ParsedBrandData): Partial<Brand> {
    return {
      name: data.name,
      slug: data.slug,
      country: data.country,
      rating: data.rating,
      ratingsCount: data.ratingsCount,
      description: data.description,
      logoUrl: data.logoUrl,
      status: data.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
