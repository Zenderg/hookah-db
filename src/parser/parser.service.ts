import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  // TODO: Implement parser logic
  // This service will parse data from htreviews.org

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyRefresh() {
    this.logger.log('Starting daily data refresh...');
    // TODO: Implement parsing logic
  }
}
