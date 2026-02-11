import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { FlavorsService } from './flavors.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';

@Controller('flavors')
@UseGuards(ApiKeyGuard)
@UseInterceptors(LoggingInterceptor)
export class FlavorsController {
  constructor(private readonly flavorsService: FlavorsService) {}

  @Get()
  async findAll() {
    return this.flavorsService.findAll();
  }
}
