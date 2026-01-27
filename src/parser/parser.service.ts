import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../brands/brands.entity';
import { BrandParserStrategy } from './strategies/brand-parser.strategy';

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    private readonly brandParserStrategy: BrandParserStrategy,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyRefresh() {
    this.logger.log('Starting daily data refresh...');

    try {
      await this.brandParserStrategy.initialize();

      // Parse all brands from htreviews.org
      const parsedBrands = await this.brandParserStrategy.parseBrands();
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
        `Daily refresh completed: ${createdCount} created, ${updatedCount} updated, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error(
        `Daily refresh failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      await this.brandParserStrategy.close();
    }
  }

  async parseBrandsManually(): Promise<void> {
    this.logger.log('Starting manual brand parsing...');
    await this.handleDailyRefresh();
  }
}
