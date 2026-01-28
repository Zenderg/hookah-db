import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Line } from '../../lines/lines.entity';

export type ParsedLineData = {
  name: string;
  slug: string;
  brandId: string;
  description: string;
  imageUrl: string;
  strengthOfficial: string;
  strengthByRatings: string;
  status: string;
  rating: number;
  ratingsCount: number;
  detailUrl: string;
};

@Injectable()
export class LineParserStrategy {
  private readonly logger = new Logger(LineParserStrategy.name);
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

  async parseLines(
    brandUrls: { url: string; brandId: string }[],
    limit?: number,
  ): Promise<ParsedLineData[]> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const allLines: ParsedLineData[] = [];

    for (let i = 0; i < brandUrls.length; i++) {
      const { url, brandId } = brandUrls[i];

      // Check if we've reached the limit
      if (limit && allLines.length >= limit) {
        this.logger.log(`Reached limit of ${limit} lines`);
        break;
      }

      try {
        this.logger.log(
          `Parsing lines for brand ${i + 1}/${brandUrls.length}: ${brandId}`,
        );
        const lines = await this.parseBrandDetailPage(url, brandId, limit ? limit - allLines.length : undefined);
        allLines.push(...lines);
        this.logger.log(`Parsed ${lines.length} lines from ${url}`);
      } catch (error) {
        this.logger.error(
          `Failed to parse lines from ${url}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue with next brand on error
      }
    }

    return limit ? allLines.slice(0, limit) : allLines;
  }

  private async parseBrandDetailPage(
    url: string,
    brandId: string,
    limit?: number,
  ): Promise<ParsedLineData[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const fullUrl = url.startsWith('http') ? url : `https://htreviews.org${url}`;
    await this.page.goto(fullUrl, { waitUntil: 'networkidle' });

    const lines = await this.page.evaluate(() => {
      const lineItems: ParsedLineData[] = [];

      // Find all line items - look for elements that contain line data
      // Based on specification, lines are in a section with "Линейки" heading
      const lineElements = document.querySelectorAll('.tobacco_list_item');

      lineElements.forEach((element) => {
        const linkElement = element.querySelector('.tobacco_list_item_slug');
        const nameElement = element.querySelector('.tobacco_list_item_slug span:first-child');
        const imageElement = element.querySelector('.tobacco_list_item_image img');

        if (!nameElement || !linkElement) {
          return;
        }

        // Get all div children to find rating, ratings count, strength, status
        const divs = Array.from(element.querySelectorAll(':scope > div > div'));

        // Find rating div (contains decimal like 4.8)
        const ratingDiv = divs.find((div) => {
          const text = div.textContent.trim();
          return text.match(/^\d+\.\d+$/);
        });

        // Find ratings count div (contains 3-5 digit number)
        const ratingsCountDiv = divs.find((div) => {
          const text = div.textContent.trim();
          return text.match(/^\d{3,5}$/);
        });

        // Find description div (long text)
        const descriptionDiv = divs.find((div) => {
          const text = div.textContent.trim();
          return text.length > 50;
        });

        // Find strength official (Крепость официальная)
        const strengthOfficialDiv = divs.find((div) => {
          const text = div.textContent.trim();
          return (
            text.includes('Крепость') &&
            (text.includes('Лёгкая') ||
              text.includes('Средне-лёгкая') ||
              text.includes('Средняя') ||
              text.includes('Средне-крепкая') ||
              text.includes('Крепкая') ||
              text.includes('Смешанная') ||
              text.includes('Не указано'))
          );
        });

        // Find strength by ratings (Крепость по оценкам)
        const strengthByRatingsDiv = divs.find((div) => {
          const text = div.textContent.trim();
          return (
            text.includes('по оценкам') &&
            (text.includes('Лёгкая') ||
              text.includes('Средне-лёгкая') ||
              text.includes('Средняя') ||
              text.includes('Средне-крепкая') ||
              text.includes('Крепкая'))
          );
        });

        // Find status (Статус)
        const statusDiv = divs.find((div) => {
          const text = div.textContent.trim();
          return (
            text.includes('Статус') &&
            (text.includes('Выпускается') ||
              text.includes('Лимитированная') ||
              text.includes('Лимитированный') ||
              text.includes('Снята с производства'))
          );
        });

        const name = nameElement.textContent?.trim() || '';
        const detailUrl = linkElement.getAttribute('href') || '';

        // Skip if no name or URL
        if (!name || !detailUrl) {
          return;
        }

        // Extract slug from detailUrl (format: /tobaccos/{brand-slug}/{line-slug})
        let slug = '';
        if (detailUrl) {
          const urlMatch = detailUrl.match(/\/tobaccos\/[^\/]+\/([^\/?]+)/);
          if (urlMatch) {
            slug = urlMatch[1];
          }
        }

        lineItems.push({
          name,
          slug,
          brandId,
          description: descriptionDiv?.textContent?.trim() || '',
          imageUrl: imageElement?.getAttribute('src') || '',
          strengthOfficial: this.extractStrengthValue(strengthOfficialDiv?.textContent || ''),
          strengthByRatings: this.extractStrengthValue(strengthByRatingsDiv?.textContent || ''),
          status: this.extractStatusValue(statusDiv?.textContent || ''),
          rating: parseFloat(ratingDiv?.textContent?.trim() || '0'),
          ratingsCount: parseInt(ratingsCountDiv?.textContent?.trim() || '0', 10),
          detailUrl,
        });
      });

      return lineItems;
    });

    return limit ? lines.slice(0, limit) : lines;
  }

  private extractStrengthValue(text: string): string {
    if (!text) return '';
    
    const strengths = ['Лёгкая', 'Средне-лёгкая', 'Средняя', 'Средне-крепкая', 'Крепкая', 'Смешанная'];
    for (const strength of strengths) {
      if (text.includes(strength)) {
        return strength;
      }
    }
    return 'Не указано';
  }

  private extractStatusValue(text: string): string {
    if (!text) return '';
    
    if (text.includes('Выпускается')) return 'Выпускается';
    if (text.includes('Лимитированная') || text.includes('Лимитированный')) return 'Лимитированная';
    if (text.includes('Снята с производства')) return 'Снята с производства';
    
    return '';
  }

  normalizeToEntity(data: ParsedLineData): Partial<Line> {
    return {
      name: data.name,
      slug: data.slug,
      brandId: data.brandId,
      description: data.description || undefined,
      imageUrl: data.imageUrl,
      strengthOfficial: data.strengthOfficial,
      strengthByRatings: data.strengthByRatings,
      status: data.status,
      rating: data.rating,
      ratingsCount: data.ratingsCount,
    };
  }
}
