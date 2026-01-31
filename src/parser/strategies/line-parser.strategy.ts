import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Line } from '../../lines/lines.entity';

export type LineUrlInfo = {
  name: string;
  slug: string;
  url: string;
  rating: number;
  strengthOfficial: string;
  strengthByRatings: string;
  status: string;
  description: string;
  flavorsCount: number;
};

export type ParsedLineData = {
  name: string;
  slug: string;
  brandId: string;
  description: string | null;
  imageUrl: string | null;
  strengthOfficial: string | null;
  strengthByRatings: string | null;
  status: string | null;
  rating: number;
  ratingsCount: number;
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

      // Check if we've reached limit
      if (limit && allLines.length >= limit) {
        this.logger.log(`Reached limit of ${limit} lines`);
        break;
      }

      try {
        this.logger.log(
          `Parsing lines for brand ${i + 1}/${brandUrls.length}: ${brandId}`,
        );

        // Extract line data from brand page (basic data)
        const lineData = await this.extractLinesFromBrandPage(url, brandId);
        this.logger.log(`Found ${lineData.length} lines on ${url}`);

        // Extract brand slug from URL for detail page navigation
        const brandSlugMatch = url.match(/\/tobaccos\/([^\/]+)/);
        const brandSlug = brandSlugMatch ? brandSlugMatch[1] : '';

        for (const line of lineData) {
          // Check limit again
          if (limit && allLines.length >= limit) {
            this.logger.log(`Reached limit of ${limit} lines`);
            break;
          }

          // Extract additional data from line detail page (ratingsCount, imageUrl, strengthByRatings, description)
          if (brandSlug && line.slug) {
            try {
              const additionalData = await this.extractAdditionalDataFromDetailPage(
                line.slug,
                brandSlug,
              );
              line.ratingsCount = additionalData.ratingsCount;
              line.imageUrl = additionalData.imageUrl;
              line.strengthOfficial = additionalData.strengthOfficial;
              line.strengthByRatings = additionalData.strengthByRatings;
              // Only update description if it was extracted from detail page
              if (additionalData.description) {
                line.description = additionalData.description;
              }
              this.logger.debug(
                `Extracted additional data for ${line.name}: ` +
                  `ratingsCount=${line.ratingsCount}, ` +
                  `imageUrl=${line.imageUrl ? 'yes' : 'no'}, ` +
                  `strengthByRatings=${line.strengthByRatings || 'N/A'}, ` +
                  `description=${line.description ? 'yes' : 'no'}`,
              );
            } catch (error) {
              this.logger.warn(
                `Failed to extract additional data for ${line.name}: ${error instanceof Error ? error.message : String(error)}`,
              );
              // Continue with line even if detail page extraction fails
            }
          }

          allLines.push(line);
          this.logger.log(`Parsed line: ${line.name}`);
        }

        // Break outer loop if limit reached
        if (limit && allLines.length >= limit) {
          break;
        }
      } catch (error) {
        this.logger.error(
          `Failed to parse lines from ${url}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue with next brand on error
      }
    }

    return limit ? allLines.slice(0, limit) : allLines;
  }

  /**
   * Extract line data from brand detail page
   * All line data is available on brand page, no need to navigate to line detail pages
   */
  private async extractLinesFromBrandPage(
    url: string,
    brandId: string,
  ): Promise<ParsedLineData[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const fullUrl = url.startsWith('http')
      ? url
      : `https://htreviews.org${url}`;
    await this.page.goto(fullUrl, { waitUntil: 'networkidle' });

    const lines = await this.page.evaluate(() => {
      const lineItems: ParsedLineData[] = [];

      // Find "Линейки" section - look for h2 containing "Линейки"
      const allHeadings = Array.from(document.querySelectorAll('h2'));
      const linesHeading = allHeadings.find((h2) => {
        const text = h2.textContent?.trim() || '';
        return text.includes('Линейки');
      });

      if (!linesHeading) {
        console.log('No "Линейки" heading found');
        return lineItems;
      }

      // Get container after heading - it's a sibling of heading's parent
      const headingParent = linesHeading.parentElement;
      const linesContainer = headingParent?.nextElementSibling;
      if (!linesContainer) {
        console.log('No container found after "Линейки" heading');
        return lineItems;
      }

      // Find all line items - each line item is a child element (div/generic)
      // The first child contains link and heading
      const lineElements = Array.from(linesContainer.children).filter((child) => {
        // Check if first child contains a link with h3
        const firstChild = child.firstElementChild;
        if (firstChild) {
          const link = firstChild.querySelector('a');
          const heading = firstChild.querySelector('h3');
          return link && heading;
        }
        return false;
      });

      console.log(`Found ${lineElements.length} line elements`);

      lineElements.forEach((element) => {
        try {
          // The link and heading are inside first child element
          const firstChild = element.firstElementChild;
          if (!firstChild) {
            return;
          }

          // Extract line name from heading
          const headingElement = firstChild.querySelector('h3');
          const name = headingElement?.textContent?.trim() || '';

          // Extract URL slug from link
          const linkElement = firstChild.querySelector('a');
          const detailUrl = linkElement?.getAttribute('href') || '';

          // Extract slug from URL (format: dogma/100-sigarnyy-pank or /tobaccos/dogma/100-sigarnyy-pank)
          let slug = '';
          if (detailUrl) {
            const urlMatch = detailUrl.match(/([^/]+)\/([^/]+)$/);
            if (urlMatch) {
              slug = urlMatch[2]; // Get last segment (line slug)
            }
          }

          // Skip if no name or slug
          if (!name || !slug) {
            return;
          }

          // Extract rating - use specific selector for .lines_item_score div
          let rating = 0;
          const scoreElement = element.querySelector('.lines_item_score');
          if (scoreElement) {
            const ratingSpan = scoreElement.querySelector('span');
            const ratingText = ratingSpan?.textContent?.trim() || '';
            const parsedRating = parseFloat(ratingText);
            if (!isNaN(parsedRating) && parsedRating > 0 && parsedRating <= 5) {
              rating = parsedRating;
            }
          }

          // Extract status - look for status values
          let status = '';
          const textContent = element.textContent || '';
          const statusValues = [
            'Выпускается',
            'Лимитированная',
            'Снята с производства',
          ];
          for (const statusValue of statusValues) {
            if (textContent.includes(statusValue)) {
              status = statusValue;
              break;
            }
          }

          // Extract description - find longest text (>50 chars) from child elements
          let description = '';
          const allTextElements = Array.from(element.children).slice(1); // Skip first child (has link/heading)
          for (const textElement of allTextElements) {
            const text = textElement.textContent?.trim() || '';
            if (text.length > 50 && text.length > description.length && !text.includes('вкусов')) {
              description = text;
            }
          }

          lineItems.push({
            name,
            slug,
            brandId: '', // Will be set by caller
            description: description || null,
            imageUrl: null, // Will be extracted from detail page if needed
            strengthOfficial: null, // Will be extracted from detail page
            strengthByRatings: null, // Not available on brand page
            status: status || null,
            rating,
            ratingsCount: 0, // Will be extracted from detail page
          });
        } catch (error) {
          console.error('Error parsing line item:', error);
        }
      });

      return lineItems;
    });

    // Set brandId for all lines
    return lines.map((line) => ({
      ...line,
      brandId,
    }));
  }

  /**
   * Extract additional data from line detail page (imageUrl, ratingsCount, strengthByRatings)
   */
  async extractAdditionalDataFromDetailPage(
    lineSlug: string,
    brandSlug: string,
  ): Promise<{
    imageUrl: string | null;
    ratingsCount: number;
    strengthOfficial: string | null;
    strengthByRatings: string | null;
    description: string | null;
  }> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const fullUrl = `https://htreviews.org/tobaccos/${brandSlug}/${lineSlug}`;

    this.logger.debug(`Parsing line detail page: ${fullUrl}`);

    try {
      await this.page.goto(fullUrl, { waitUntil: 'networkidle' });

      const data = await this.page.evaluate(() => {
        // Get all elements for searching
        const allElements = Array.from(document.querySelectorAll('*'));

        // Extract imageUrl: Try multiple selectors
        let imageUrl = '';
        const imageSelectors = [
          'main img', // First image in main
          'img[alt]', // Any image with alt text
          'img[src*="uploads/objects"]', // Most specific - images from uploads folder
          'img', // Fallback to any image
        ];

        for (const selector of imageSelectors) {
          const imageElement = document.querySelector(selector);
          if (imageElement) {
            imageUrl = imageElement.getAttribute('src') || '';
            if (imageUrl) {
              break;
            }
          }
        }

        let ratingsCount = 0;
        let strengthOfficial = '';
        let strengthByRatings = '';

        // Find ratings count by looking for div with data-hover-title="Оценки" and extracting the span value
        const ratingsElement = document.querySelector('div[data-hover-title="Оценки"]');
        if (ratingsElement) {
          const ratingsSpan = ratingsElement.querySelector('span');
          const ratingsText = ratingsSpan?.textContent?.trim() || '';
          // Parse the number (handle 'k' suffix for thousands)
          if (ratingsText) {
            if (ratingsText.endsWith('k')) {
              const numPart = parseFloat(ratingsText.slice(0, -1));
              ratingsCount = Math.round(numPart * 1000);
            } else {
              ratingsCount = parseInt(ratingsText, 10);
            }
          }
        }

        // Extract strengthOfficial: Look for "Крепость официальная" label
        const labelElementForOfficial = allElements.find((el) => {
          const text = el.textContent?.trim() || '';
          // Only match elements where text is EXACTLY the label, not elements that contain the label
          return text === 'Крепость официальная';
        });

        if (labelElementForOfficial) {
          // The label is in a container, and the value is a sibling of that container
          const labelContainer = labelElementForOfficial.parentElement;
          if (labelContainer) {
            const parentContainer = labelContainer.parentElement;
            if (parentContainer) {
              // Find sibling of labelContainer that contains the strength value
              const valueDivForOfficial = Array.from(
                parentContainer.children,
              ).find((child) => {
                const text = child.textContent?.trim() || '';
                const strengthValues = [
                  'Лёгкая',
                  'Средне-лёгкая',
                  'Средняя',
                  'Средне-крепкая',
                  'Крепкая',
                  'Не указано',
                  'Смешанная',
                ];
                return strengthValues.includes(text);
              });

              if (valueDivForOfficial) {
                strengthOfficial = valueDivForOfficial.textContent?.trim() || '';
              }
            }
          }
        }

        // Extract strengthByRatings: Look for "Крепость по оценкам" label
        const labelElementForRatings = allElements.find((el) => {
          const text = el.textContent?.trim() || '';
          // Only match elements where text is EXACTLY the label, not elements that contain the label
          return text === 'Крепость по оценкам';
        });

        if (labelElementForRatings) {
          // The label is in a container, and the value is a sibling of that container
          const labelContainer = labelElementForRatings.parentElement;
          if (labelContainer) {
            const parentContainer = labelContainer.parentElement;
            if (parentContainer) {
              // Find sibling of labelContainer that contains the strength value
              const valueDivForRatings = Array.from(
                parentContainer.children,
              ).find((child) => {
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
              });

              if (valueDivForRatings) {
                strengthByRatings = valueDivForRatings.textContent?.trim() || '';
              }
            }
          }
        }

        // Extract description from JSON-LD schema
        let description = '';
        const jsonLdScripts = Array.from(
          document.querySelectorAll('script[type="application/ld+json"]'),
        );

        for (const script of jsonLdScripts) {
          try {
            const data = JSON.parse(script.textContent || '');
            // Check if it's a Product with description
            if (data['@type'] === 'Product' && data.description) {
              description = data.description;
              break;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }

          // Fallback: If no description from JSON-LD, try to extract from HTML
          if (!description) {
            // First fallback: Look for description in .object_card_discr container
            const descriptionContainer = document.querySelector('.object_card_discr');
            if (descriptionContainer) {
              // The description is typically in a span element within this container
              const descriptionSpan = descriptionContainer.querySelector('span');
              if (descriptionSpan) {
                const text = descriptionSpan.textContent?.trim() || '';
                if (text.length > 50) {
                  description = text;
                }
              }
            }

            // Second fallback: Find h1 heading (line name) and look for description in its container
            if (!description) {
              const h1 = document.querySelector('h1');
              if (h1) {
                // Get container that holds h1
                const h1Container = h1.parentElement;
                if (h1Container) {
                  // Get all children of the container
                  const children = Array.from(h1Container.children);
                  // The description is typically the second child (after h1)
                  // Look for a generic element with long text content
                  for (let i = 1; i < children.length; i++) {
                    const child = children[i];
                    const text = child.textContent?.trim() || '';
                    // Check if it's a long text (>50 chars)
                    // Either contains description keywords OR is very long (>100 chars) and not just whitespace
                    if (text.length > 50) {
                      // Prefer text with description keywords
                      if (text.includes('Описание') || text.includes('Описание линейки')) {
                        description = text;
                        break;
                      }
                      // Fallback: use very long text that doesn't contain brand/line info
                      // Skip if it contains brand info (like "Бренд", "Сайт", etc.)
                      if (text.length > 100 && !text.includes('Бренд') && !text.includes('Сайт') && !text.includes('Крепость')) {
                        description = text;
                        break;
                      }
                    }
                  }
                }
              }
            }
          }

        return {
          imageUrl,
          ratingsCount,
          strengthOfficial,
          strengthByRatings,
          description,
        };
      });

      this.logger.debug(
        `Extracted additional data: ` +
          `imageUrl=${data.imageUrl ? 'yes' : 'no'}, ` +
          `ratingsCount=${data.ratingsCount}, ` +
          `strengthOfficial=${data.strengthOfficial || 'N/A'}, ` +
          `strengthByRatings=${data.strengthByRatings || 'N/A'}, ` +
          `description=${data.description ? 'yes' : 'no'}`,
      );

      return data;
    } catch (error) {
      this.logger.error(
        `Failed to parse line detail page ${fullUrl}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Parse a single line from its detail URL
   * @param url - Line detail URL (e.g., "/tobaccos/dogma/100-sigarnyy-pank" or "https://htreviews.org/tobaccos/dogma/100-sigarnyy-pank")
   * @param brandId - Brand ID for the line
   * @returns Parsed line data
   */
  async parseLineByUrl(url: string, brandId: string): Promise<ParsedLineData> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const fullUrl = url.startsWith('http')
      ? url
      : `https://htreviews.org${url}`;

    this.logger.log(`Parsing line from URL: ${fullUrl}`);

    // Extract brand slug and line slug from URL
    const urlMatch = fullUrl.match(/\/tobaccos\/([^/]+)\/([^/?]+)/);
    const brandSlug = urlMatch ? urlMatch[1] : '';
    const lineSlug = urlMatch ? urlMatch[2] : '';

    if (!brandSlug || !lineSlug) {
      throw new Error(`Invalid line URL format: ${fullUrl}`);
    }

    // Extract additional data from line detail page
    const additionalData = await this.extractAdditionalDataFromDetailPage(
      lineSlug,
      brandSlug,
    );

    // Extract basic line data from brand page
    const brandPageUrl = `/tobaccos/${brandSlug}`;
    const lineDataList = await this.extractLinesFromBrandPage(brandPageUrl, brandId);
    const lineData = lineDataList.find((line) => line.slug === lineSlug);

    if (!lineData) {
      throw new Error(`Line not found on brand page: ${lineSlug}`);
    }

    // Merge data from brand page and detail page
    return {
      ...lineData,
      brandId,
      imageUrl: additionalData.imageUrl,
      ratingsCount: additionalData.ratingsCount,
      strengthOfficial: additionalData.strengthOfficial,
      strengthByRatings: additionalData.strengthByRatings,
      description: additionalData.description || lineData.description,
    };
  }

  normalizeToEntity(data: ParsedLineData): Partial<Line> {
    return {
      name: data.name,
      slug: data.slug,
      brandId: data.brandId,
      description: data.description || undefined,
      imageUrl: data.imageUrl || undefined,
      strengthOfficial: data.strengthOfficial || undefined,
      strengthByRatings: data.strengthByRatings || undefined,
      status: data.status || undefined,
      rating: data.rating || 0,
      ratingsCount: data.ratingsCount || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
