import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Brand } from '../../brands/brands.entity';

export type ParsedBrandData = {
  name: string;
  country: string;
  rating: number;
  ratingsCount: number;
  description: string;
  logoUrl: string;
  detailUrl: string;
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

  async parseBrands(): Promise<ParsedBrandData[]> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const allBrands: ParsedBrandData[] = [];

    // Parse best brands
    this.logger.log('Parsing best brands...');
    const bestBrands = await this.parseBrandList(
      'https://htreviews.org/tobaccos/brands?r=position&s=rating&d=desc',
    );
    allBrands.push(...bestBrands);
    this.logger.log(`Parsed ${bestBrands.length} best brands`);

    // Parse other brands
    this.logger.log('Parsing other brands...');
    const otherBrands = await this.parseBrandList(
      'https://htreviews.org/tobaccos/brands?r=others&s=rating&d=desc',
    );
    allBrands.push(...otherBrands);
    this.logger.log(`Parsed ${otherBrands.length} other brands`);

    // Parse detail pages for logoUrl and full description
    this.logger.log('Parsing brand detail pages...');
    for (let i = 0; i < allBrands.length; i++) {
      const brand = allBrands[i];
      try {
        this.logger.log(
          `Parsing detail page for brand ${i + 1}/${allBrands.length}: ${brand.name}`,
        );
        const detailData = await this.parseBrandDetail(brand.detailUrl);
        allBrands[i] = {
          ...brand,
          logoUrl: detailData.logoUrl,
          description: detailData.description,
        };
      } catch (error) {
        this.logger.error(
          `Failed to parse detail page for ${brand.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue with next brand on error
      }
    }

    return allBrands;
  }

  private async parseBrandList(url: string): Promise<ParsedBrandData[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.goto(url, { waitUntil: 'networkidle' });

    const brands: ParsedBrandData[] = [];
    const seenUrls = new Set<string>();
    let previousCount = 0;
    let noNewContentCount = 0;
    const maxNoNewContent = 3;

    while (noNewContentCount < maxNoNewContent) {
      // Scroll to bottom to trigger infinite scroll
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.page.waitForTimeout(2000);

      // Extract brand items
      const brandItems = await this.page.$$eval(
        '[data-testid="brand-item"]',
        (elements) => {
          return elements.map((element) => {
            const nameElement = element.querySelector(
              '[data-testid="brand-name"]',
            );
            const countryElement = element.querySelector(
              '[data-testid="brand-country"]',
            );
            const ratingElement = element.querySelector(
              '[data-testid="brand-rating"]',
            );
            const ratingsCountElement = element.querySelector(
              '[data-testid="brand-ratings-count"]',
            );
            const linkElement = element.querySelector('a[href*="/tobaccos/"]');

            return {
              name: nameElement?.textContent?.trim() || '',
              country: countryElement?.textContent?.trim() || '',
              rating: parseFloat(ratingElement?.textContent?.trim() || '0'),
              ratingsCount: parseInt(
                ratingsCountElement?.textContent?.trim() || '0',
                10,
              ),
              detailUrl: linkElement?.getAttribute('href') || '',
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

      brands.push(
        ...newBrands.map((brand) => ({
          ...brand,
          description: '',
          logoUrl: '',
        })),
      );

      // Check if new content was loaded
      const currentCount = brands.length;
      if (currentCount === previousCount) {
        noNewContentCount++;
      } else {
        noNewContentCount = 0;
        previousCount = currentCount;
      }
    }

    return brands.map((brand) => ({
      ...brand,
      description: '',
      logoUrl: '',
    }));
  }

  private async parseBrandDetail(detailUrl: string): Promise<{
    logoUrl: string;
    description: string;
  }> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const fullUrl = detailUrl.startsWith('http')
      ? detailUrl
      : `https://htreviews.org${detailUrl}`;

    await this.page.goto(fullUrl, { waitUntil: 'networkidle' });

    const data = await this.page.evaluate(() => {
      const logoImg = document.querySelector(
        'img[alt*="brand"], img[alt*="Бренд"]',
      );
      const descriptionElement = document.querySelector(
        '[data-testid="brand-description"], .brand-description, p.description',
      );

      return {
        logoUrl: logoImg?.getAttribute('src') || '',
        description: descriptionElement?.textContent?.trim() || '',
      };
    });

    return data;
  }

  normalizeToEntity(data: ParsedBrandData): Partial<Brand> {
    return {
      name: data.name,
      country: data.country,
      rating: data.rating,
      ratingsCount: data.ratingsCount,
      description: data.description,
      logoUrl: data.logoUrl,
    };
  }
}
