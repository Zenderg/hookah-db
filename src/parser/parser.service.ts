import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../brands/brands.entity';
import { Line } from '../lines/lines.entity';
import { BrandParserStrategy } from './strategies/brand-parser.strategy';
import { LineParserStrategy } from './strategies/line-parser.strategy';

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(Line)
    private readonly lineRepository: Repository<Line>,
    private readonly brandParserStrategy: BrandParserStrategy,
    private readonly lineParserStrategy: LineParserStrategy,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyRefresh(limit?: number): Promise<{
    created: number;
    updated: number;
    errors: number;
  }> {
    this.logger.log('Starting data refresh...');

    try {
      await this.brandParserStrategy.initialize();

      // Parse all brands from htreviews.org
      const parsedBrands = await this.brandParserStrategy.parseBrands(limit);
      this.logger.log(
        `Parsed ${parsedBrands.length} brands from htreviews.org`,
      );

      // Update or create brands in database
      let updatedCount = 0;
      let createdCount = 0;
      let errorCount = 0;

      for (const parsedBrand of parsedBrands) {
        try {
          const brandData =
            this.brandParserStrategy.normalizeToEntity(parsedBrand);

          // Check if brand already exists by name
          const existingBrand = await this.brandRepository.findOne({
            where: { name: brandData.name },
          });

          if (existingBrand) {
            // Update existing brand
            await this.brandRepository.update(existingBrand.id, brandData);
            updatedCount++;
            this.logger.debug(
              `Updated brand: ${brandData.name} (ID: ${existingBrand.id})`,
            );
          } else {
            // Create new brand
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
          // Continue with next brand on error
        }
      }

      this.logger.log(
        `Refresh completed: ${createdCount} created, ${updatedCount} updated, ${errorCount} errors`,
      );

      return {
        created: createdCount,
        updated: updatedCount,
        errors: errorCount,
      };
    } catch (error) {
      this.logger.error(
        `Refresh failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    } finally {
      await this.brandParserStrategy.close();
    }
  }

  async parseBrandsManually(limit?: number): Promise<void> {
    this.logger.log('Starting manual brand parsing...');
    await this.handleDailyRefresh(limit);
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

      this.logger.log(`Parsing lines for ${brandUrls.length} brands with slugs`);

      // Parse lines from brand detail pages
      const parsedLines = await this.lineParserStrategy.parseLines(brandUrls, limit);
      this.logger.log(`Parsed ${parsedLines.length} lines from htreviews.org`);

      // Update or create lines in database
      let updatedCount = 0;
      let createdCount = 0;
      let errorCount = 0;

      for (const parsedLine of parsedLines) {
        try {
          const lineData = this.lineParserStrategy.normalizeToEntity(parsedLine);

          // Check if line already exists by name and brandId
          const existingLine = await this.lineRepository.findOne({
            where: { name: lineData.name, brandId: lineData.brandId },
          });

          if (existingLine) {
            // Update existing line
            await this.lineRepository.update(existingLine.id, lineData);
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
}
