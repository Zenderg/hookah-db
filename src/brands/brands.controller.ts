import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { Public } from '../common/decorators/public.decorator';

@Controller('brands')
@UseGuards(ApiKeyGuard)
@UseInterceptors(LoggingInterceptor)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @Public()
  async findAll() {
    // TODO: Implement pagination, filtering, and sorting
    return this.brandsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return this.brandsService.findOne(id);
    } catch (error) {
      throw new NotFoundException('Brand not found');
    }
  }
}
