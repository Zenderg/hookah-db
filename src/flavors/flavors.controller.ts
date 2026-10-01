import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { FlavorsService } from './flavors.service';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';

@Controller('flavors')
@UseInterceptors(LoggingInterceptor)
export class FlavorsController {
  constructor(private readonly flavorsService: FlavorsService) {}

  @Get()
  async findAll() {
    return this.flavorsService.findAll();
  }
}
