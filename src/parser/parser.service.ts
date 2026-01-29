import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../brands/brands.entity';
import { Line } from '../lines/lines.entity';
import { Tobacco } from '../tobaccos/tobaccos.entity';
import { BrandParserStrategy } from './strategies/brand-parser.strategy';
import { LineParserStrategy } from './strategies/line-parser.strategy';
import { TobaccoParserStrategy } from './strategies/tobacco-parser.strategy';

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
    private readonly brandParserStrategy: BrandParserStrategy,
    private readonly lineParserStrategy: LineParserStrategy,
    private readonly tobaccoParserStrategy: TobaccoParserStrategy,
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

      // Parse lines - strategy extracts all data from brand pages
      const parsedLines = await this.lineParserStrategy.parseLines(brandUrls, limit);
      this.logger.log(`Parsed ${parsedLines.length} lines from htreviews.org`);

      // Update or create lines in database
      let updatedCount = 0;
      let createdCount = 0;
      let errorCount = 0;

      for (const parsedLine of parsedLines) {
        try {
          const lineData = this.lineParserStrategy.normalizeToEntity(parsedLine);

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

      this.logger.log(`Parsing tobaccos for ${lineUrls.length} lines with slugs`);

      // Parse tobaccos
      const parsedTobaccos = await this.tobaccoParserStrategy.parseTobaccos(lineUrls, limit);
      this.logger.log(`Parsed ${parsedTobaccos.length} tobaccos from htreviews.org`);

      // Update or create tobaccos in database
      let updatedCount = 0;
      let createdCount = 0;
      let errorCount = 0;

      for (const parsedTobacco of parsedTobaccos) {
        try {
          const tobaccoData = this.tobaccoParserStrategy.normalizeToEntity(parsedTobacco);

          // Check if tobacco already exists by htreviewsId
          const existingTobacco = await this.tobaccoRepository.findOne({
            where: { htreviewsId: tobaccoData.htreviewsId },
          });

          if (existingTobacco) {
            // Update existing tobacco
            await this.tobaccoRepository.update(existingTobacco.id, tobaccoData);
            updatedCount++;
            this.logger.debug(
              `Updated tobacco: ${tobaccoData.name} (ID: ${existingTobacco.id})`,
            );
          } else {
            // Create new tobacco
            const newTobacco = this.tobaccoRepository.create(tobaccoData);
            await this.tobaccoRepository.save(newTobacco);
            createdCount++;
            this.logger.debug(`Created tobacco: ${tobaccoData.name}`);
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
}
