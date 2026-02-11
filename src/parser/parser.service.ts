import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../brands/brands.entity';
import { Line } from '../lines/lines.entity';
import { Tobacco } from '../tobaccos/tobaccos.entity';
import { Flavor } from '../flavors/flavors.entity';
import { BrandParserStrategy } from './strategies/brand-parser.strategy';
import { LineParserStrategy } from './strategies/line-parser.strategy';
import { TobaccoParserStrategy } from './strategies/tobacco-parser.strategy';
import { ParsedTobaccoData } from './strategies/tobacco-parser.strategy';

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(Line)
    private readonly lineRepository: Repository<Line>,
    @InjectRepository(Tobacco)
    private readonly tobaccoRepository: Repository<Tobacco>,
    @InjectRepository(Flavor)
    private readonly flavorRepository: Repository<Flavor>,
    private readonly brandParserStrategy: BrandParserStrategy,
    private readonly lineParserStrategy: LineParserStrategy,
    private readonly tobaccoParserStrategy: TobaccoParserStrategy,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyRefresh(): Promise<{
    brands: { created: number; updated: number; errors: number };
    lines: { created: number; updated: number; errors: number };
    tobaccos: { created: number; updated: number; errors: number };
  }> {
    this.logger.log('Starting daily data refresh...');

    const results = {
      brands: { created: 0, updated: 0, errors: 0 },
      lines: { created: 0, updated: 0, errors: 0 },
      tobaccos: { created: 0, updated: 0, errors: 0 },
    };

    // Step 1: Parse brands
    try {
      this.logger.log('Step 1: Parsing brands...');
      await this.brandParserStrategy.initialize();

      const parsedBrands = await this.brandParserStrategy.parseBrands();
      this.logger.log(
        `Parsed ${parsedBrands.length} brands from htreviews.org`,
      );

      for (const parsedBrand of parsedBrands) {
        try {
          const brandData =
            this.brandParserStrategy.normalizeToEntity(parsedBrand);
          const existingBrand = await this.brandRepository.findOne({
            where: { name: brandData.name },
          });

          if (existingBrand) {
            await this.brandRepository.update(existingBrand.id, brandData);
            results.brands.updated++;
            this.logger.debug(`Updated brand: ${brandData.name}`);
          } else {
            const newBrand = this.brandRepository.create(brandData);
            await this.brandRepository.save(newBrand);
            results.brands.created++;
            this.logger.debug(`Created brand: ${brandData.name}`);
          }
        } catch (error) {
          results.brands.errors++;
          this.logger.error(
            `Failed to save brand ${parsedBrand.name}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      this.logger.log(
        `Brands refresh completed: ${results.brands.created} created, ${results.brands.updated} updated, ${results.brands.errors} errors`,
      );
    } catch (error) {
      this.logger.error(
        `Brands refresh failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      results.brands.errors++;
    } finally {
      await this.brandParserStrategy.close();
    }

    // Step 2: Parse lines (only if brands were successfully parsed)
    if (results.brands.created > 0 || results.brands.updated > 0) {
      try {
        this.logger.log('Step 2: Parsing lines...');
        await this.lineParserStrategy.initialize();

        const brands = await this.brandRepository.find();
        const brandUrls = brands
          .filter((brand) => brand.slug)
          .map((brand) => ({
            url: `/tobaccos/${brand.slug}`,
            brandId: brand.id,
          }));

        this.logger.log(`Parsing lines for ${brandUrls.length} brands`);

        const parsedLines = await this.lineParserStrategy.parseLines(brandUrls);
        this.logger.log(
          `Parsed ${parsedLines.length} lines from htreviews.org`,
        );

        for (const parsedLine of parsedLines) {
          try {
            const lineData =
              this.lineParserStrategy.normalizeToEntity(parsedLine);
            const existingLine = await this.lineRepository.findOne({
              where: { slug: lineData.slug, brandId: lineData.brandId },
            });

            if (existingLine) {
              const updateData: Partial<Line> = {
                name: lineData.name,
                slug: lineData.slug,
                brandId: lineData.brandId,
                description: lineData.description,
                imageUrl: lineData.imageUrl,
                strengthOfficial: lineData.strengthOfficial,
                strengthByRatings: lineData.strengthByRatings,
                status: lineData.status,
                rating: lineData.rating,
                ratingsCount: lineData.ratingsCount,
              };
              await this.lineRepository.update(existingLine.id, updateData);
              results.lines.updated++;
              this.logger.debug(`Updated line: ${lineData.name}`);
            } else {
              const newLine = this.lineRepository.create(lineData);
              await this.lineRepository.save(newLine);
              results.lines.created++;
              this.logger.debug(`Created line: ${lineData.name}`);
            }
          } catch (error) {
            results.lines.errors++;
            this.logger.error(
              `Failed to save line ${parsedLine.name}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }

        this.logger.log(
          `Lines refresh completed: ${results.lines.created} created, ${results.lines.updated} updated, ${results.lines.errors} errors`,
        );
      } catch (error) {
        this.logger.error(
          `Lines refresh failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        results.lines.errors++;
      } finally {
        await this.lineParserStrategy.close();
      }
    } else {
      this.logger.warn(
        'Skipping lines parsing: no brands were created or updated',
      );
    }

    // Step 3: Parse tobaccos (only if lines were successfully parsed)
    if (results.lines.created > 0 || results.lines.updated > 0) {
      try {
        this.logger.log('Step 3: Parsing tobaccos...');
        await this.tobaccoParserStrategy.initialize();

        const lines = await this.lineRepository.find();
        const brands = await this.brandRepository.find();
        const brandMap = new Map(brands.map((b) => [b.id, b.slug]));

        const lineUrls = lines
          .filter((line) => line.slug)
          .map((line) => ({
            url: `/tobaccos/${brandMap.get(line.brandId || '')}/${line.slug}`,
            lineId: line.id,
            brandId: line.brandId || '',
            brandSlug: brandMap.get(line.brandId || '') || '',
            lineSlug: line.slug,
          }));

        this.logger.log(`Parsing tobaccos for ${lineUrls.length} lines`);

        const parsedTobaccos =
          await this.tobaccoParserStrategy.parseTobaccos(lineUrls);
        this.logger.log(
          `Parsed ${parsedTobaccos.length} tobaccos from htreviews.org`,
        );

        for (const parsedTobacco of parsedTobaccos) {
          try {
            const { action } = await this.saveTobaccoWithFlavors(parsedTobacco);
            if (action === 'updated') {
              results.tobaccos.updated++;
              this.logger.debug(`Updated tobacco: ${parsedTobacco.name}`);
            } else {
              results.tobaccos.created++;
              this.logger.debug(`Created tobacco: ${parsedTobacco.name}`);
            }
          } catch (error) {
            results.tobaccos.errors++;
            this.logger.error(
              `Failed to save tobacco ${parsedTobacco.name}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }

        this.logger.log(
          `Tobaccos refresh completed: ${results.tobaccos.created} created, ${results.tobaccos.updated} updated, ${results.tobaccos.errors} errors`,
        );
      } catch (error) {
        this.logger.error(
          `Tobaccos refresh failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        results.tobaccos.errors++;
      } finally {
        await this.tobaccoParserStrategy.close();
      }
    } else {
      this.logger.warn(
        'Skipping tobaccos parsing: no lines were created or updated',
      );
    }

    // Summary
    this.logger.log(
      `Daily refresh completed: Brands (${results.brands.created}c/${results.brands.updated}u/${results.brands.errors}e), Lines (${results.lines.created}c/${results.lines.updated}u/${results.lines.errors}e), Tobaccos (${results.tobaccos.created}c/${results.tobaccos.updated}u/${results.tobaccos.errors}e)`,
    );

    return results;
  }

  private async saveTobaccoWithFlavors(
    parsedTobacco: ParsedTobaccoData,
  ): Promise<{ action: 'created' | 'updated' }> {
    const tobaccoData =
      this.tobaccoParserStrategy.normalizeToEntity(parsedTobacco);

    // Resolve flavors: find or create each flavor
    const flavorEntities: Flavor[] = [];
    for (const flavorName of parsedTobacco.flavors) {
      let flavor = await this.flavorRepository.findOne({
        where: { name: flavorName },
      });
      if (!flavor) {
        flavor = this.flavorRepository.create({ name: flavorName });
        flavor = await this.flavorRepository.save(flavor);
      }
      flavorEntities.push(flavor);
    }

    const existingTobacco = await this.tobaccoRepository.findOne({
      where: { htreviewsId: tobaccoData.htreviewsId },
    });

    if (existingTobacco) {
      await this.tobaccoRepository.update(existingTobacco.id, tobaccoData);
      // Update flavors relation
      const tobacco = await this.tobaccoRepository.findOne({
        where: { id: existingTobacco.id },
        relations: ['flavors'],
      });
      if (tobacco) {
        tobacco.flavors = flavorEntities;
        await this.tobaccoRepository.save(tobacco);
      }
      return { action: 'updated' };
    } else {
      const newTobacco = this.tobaccoRepository.create(tobaccoData);
      newTobacco.flavors = flavorEntities;
      await this.tobaccoRepository.save(newTobacco);
      return { action: 'created' };
    }
  }

  async parseBrandsManually(limit?: number): Promise<{
    created: number;
    updated: number;
    errors: number;
  }> {
    this.logger.log('Starting manual brand parsing...');
    await this.brandParserStrategy.initialize();

    const parsedBrands = await this.brandParserStrategy.parseBrands(limit);
    this.logger.log(`Parsed ${parsedBrands.length} brands from htreviews.org`);

    let updatedCount = 0;
    let createdCount = 0;
    let errorCount = 0;

    for (const parsedBrand of parsedBrands) {
      try {
        const brandData =
          this.brandParserStrategy.normalizeToEntity(parsedBrand);
        const existingBrand = await this.brandRepository.findOne({
          where: { name: brandData.name },
        });

        if (existingBrand) {
          await this.brandRepository.update(existingBrand.id, brandData);
          updatedCount++;
          this.logger.debug(`Updated brand: ${brandData.name}`);
        } else {
          const newBrand = this.brandRepository.create(brandData);
          await this.brandRepository.save(newBrand);
          createdCount++;
          this.logger.debug(`Created brand: ${brandData.name}`);
        }
      } catch (error) {
        errorCount++;
        this.logger.error(
          `Failed to save brand ${parsedBrand.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(
      `Brand parsing completed: ${createdCount} created, ${updatedCount} updated, ${errorCount} errors`,
    );

    await this.brandParserStrategy.close();

    return {
      created: createdCount,
      updated: updatedCount,
      errors: errorCount,
    };
  }

  async parseLinesManually(limit?: number): Promise<void> {
    this.logger.log('Starting manual line parsing...');

    try {
      await this.lineParserStrategy.initialize();

      // Get all brands from database to parse their lines
      const brands = await this.brandRepository.find();
      this.logger.log(`Found ${brands.length} brands in database`);

      // Prepare brand URLs for parsing using stored slug
      const brandUrls = brands
        .filter((brand) => brand.slug) // Only parse brands that have slug
        .map((brand) => ({
          url: `/tobaccos/${brand.slug}`,
          brandId: brand.id,
        }));

      this.logger.log(
        `Parsing lines for ${brandUrls.length} brands with slugs`,
      );

      // Parse lines - strategy extracts all data from brand pages
      const parsedLines = await this.lineParserStrategy.parseLines(
        brandUrls,
        limit,
      );
      this.logger.log(`Parsed ${parsedLines.length} lines from htreviews.org`);

      // Update or create lines in database
      let updatedCount = 0;
      let createdCount = 0;
      let errorCount = 0;

      for (const parsedLine of parsedLines) {
        try {
          const lineData =
            this.lineParserStrategy.normalizeToEntity(parsedLine);

          // Check if line already exists by slug and brandId
          const existingLine = await this.lineRepository.findOne({
            where: { slug: lineData.slug, brandId: lineData.brandId },
          });

          if (existingLine) {
            // Update existing line - use Partial<Line> to handle nullable types
            const updateData: Partial<Line> = {
              name: lineData.name,
              slug: lineData.slug,
              brandId: lineData.brandId,
              description: lineData.description,
              imageUrl: lineData.imageUrl,
              strengthOfficial: lineData.strengthOfficial,
              strengthByRatings: lineData.strengthByRatings,
              status: lineData.status,
              rating: lineData.rating,
              ratingsCount: lineData.ratingsCount,
            };
            await this.lineRepository.update(existingLine.id, updateData);
            updatedCount++;
            this.logger.debug(
              `Updated line: ${lineData.name} (ID: ${existingLine.id})`,
            );
          } else {
            // Create new line
            const newLine = this.lineRepository.create(lineData);
            await this.lineRepository.save(newLine);
            createdCount++;
            this.logger.debug(`Created line: ${lineData.name}`);
          }
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Failed to save line ${parsedLine.name}: ${error instanceof Error ? error.message : String(error)}`,
          );
          // Continue with next line on error
        }
      }

      this.logger.log(
        `Line parsing completed: ${createdCount} created, ${updatedCount} updated, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error(
        `Line parsing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    } finally {
      await this.lineParserStrategy.close();
    }
  }

  async parseTobaccosManually(limit?: number): Promise<void> {
    this.logger.log('Starting manual tobacco parsing...');

    try {
      await this.tobaccoParserStrategy.initialize();

      // Get all lines from database to parse their tobaccos
      const lines = await this.lineRepository.find();
      this.logger.log(`Found ${lines.length} lines in database`);

      // Prepare line URLs for parsing
      // Get brands for slug lookup
      const brands = await this.brandRepository.find();
      const brandMap = new Map(brands.map((b) => [b.id, b.slug]));

      const lineUrls = lines
        .filter((line) => line.slug) // Only parse lines that have slug
        .map((line) => ({
          url: `/tobaccos/${brandMap.get(line.brandId || '')}/${line.slug}`,
          lineId: line.id,
          brandId: line.brandId || '',
          brandSlug: brandMap.get(line.brandId || '') || '',
          lineSlug: line.slug,
        }));

      this.logger.log(
        `Parsing tobaccos for ${lineUrls.length} lines with slugs`,
      );

      // Parse tobaccos
      const parsedTobaccos = await this.tobaccoParserStrategy.parseTobaccos(
        lineUrls,
        limit,
      );
      this.logger.log(
        `Parsed ${parsedTobaccos.length} tobaccos from htreviews.org`,
      );

      // Update or create tobaccos in database
      let updatedCount = 0;
      let createdCount = 0;
      let errorCount = 0;

      for (const parsedTobacco of parsedTobaccos) {
        try {
          const { action } = await this.saveTobaccoWithFlavors(parsedTobacco);
          if (action === 'updated') {
            updatedCount++;
            this.logger.debug(`Updated tobacco: ${parsedTobacco.name}`);
          } else {
            createdCount++;
            this.logger.debug(`Created tobacco: ${parsedTobacco.name}`);
          }
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Failed to save tobacco ${parsedTobacco.name}: ${error instanceof Error ? error.message : String(error)}`,
          );
          // Continue with next tobacco on error
        }
      }

      this.logger.log(
        `Tobacco parsing completed: ${createdCount} created, ${updatedCount} updated, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error(
        `Tobacco parsing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    } finally {
      await this.tobaccoParserStrategy.close();
    }
  }

  async parseBrandByUrl(url: string): Promise<void> {
    this.logger.log(`Parsing brand from URL: ${url}`);

    try {
      await this.brandParserStrategy.initialize();

      // Parse brand from URL
      const parsedBrand = await this.brandParserStrategy.parseBrandByUrl(url);
      this.logger.log(`Parsed brand: ${parsedBrand.name}`);

      // Normalize to entity
      const brandData = this.brandParserStrategy.normalizeToEntity(parsedBrand);

      // Check if brand already exists by slug
      const existingBrand = await this.brandRepository.findOne({
        where: { slug: brandData.slug },
      });

      if (existingBrand) {
        // Update existing brand
        await this.brandRepository.update(existingBrand.id, brandData);
        this.logger.log(
          `Updated brand: ${brandData.name} (ID: ${existingBrand.id})`,
        );
      } else {
        // Create new brand
        const newBrand = this.brandRepository.create(brandData);
        await this.brandRepository.save(newBrand);
        this.logger.log(`Created brand: ${brandData.name}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to parse brand from URL ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    } finally {
      await this.brandParserStrategy.close();
    }
  }

  async parseLineByUrl(url: string, brandId: string): Promise<void> {
    this.logger.log(`Parsing line from URL: ${url}`);

    try {
      await this.lineParserStrategy.initialize();

      // Parse line from URL
      const parsedLine = await this.lineParserStrategy.parseLineByUrl(
        url,
        brandId,
      );
      this.logger.log(`Parsed line: ${parsedLine.name}`);

      // Normalize to entity
      const lineData = this.lineParserStrategy.normalizeToEntity(parsedLine);

      // Check if line already exists by slug and brandId
      const existingLine = await this.lineRepository.findOne({
        where: { slug: lineData.slug, brandId: lineData.brandId },
      });

      if (existingLine) {
        // Update existing line
        await this.lineRepository.update(existingLine.id, lineData);
        this.logger.log(
          `Updated line: ${lineData.name} (ID: ${existingLine.id})`,
        );
      } else {
        // Create new line
        const newLine = this.lineRepository.create(lineData);
        await this.lineRepository.save(newLine);
        this.logger.log(`Created line: ${lineData.name}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to parse line from URL ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    } finally {
      await this.lineParserStrategy.close();
    }
  }

  async parseTobaccoByUrl(
    url: string,
    brandId: string,
    lineId: string,
  ): Promise<void> {
    this.logger.log(`Parsing tobacco from URL: ${url}`);

    try {
      await this.tobaccoParserStrategy.initialize();

      // Parse tobacco from URL
      const parsedTobacco = await this.tobaccoParserStrategy.parseTobaccoByUrl(
        url,
        brandId,
        lineId,
      );
      this.logger.log(`Parsed tobacco: ${parsedTobacco.name}`);

      const { action } = await this.saveTobaccoWithFlavors(parsedTobacco);
      this.logger.log(
        `${action === 'created' ? 'Created' : 'Updated'} tobacco: ${parsedTobacco.name}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to parse tobacco from URL ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    } finally {
      await this.tobaccoParserStrategy.close();
    }
  }
}
