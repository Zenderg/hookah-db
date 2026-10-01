import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { FindBrandsDto } from './dto/find-brands.dto';
import { FindTobaccosDto } from '../tobaccos/dto/find-tobaccos.dto';

@Controller('brands')
@UseInterceptors(LoggingInterceptor)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  async findAll(@Query() query: FindBrandsDto) {
    return this.brandsService.findAll(query);
  }

  @Get('countries')
  async getCountries() {
    return this.brandsService.getCountries();
  }

  @Get('statuses')
  async getStatuses() {
    return this.brandsService.getStatuses();
  }

  @Get('names')
  async getNames() {
    return this.brandsService.getNames();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return this.brandsService.findOne(id);
    } catch {
      throw new NotFoundException('Brand not found');
    }
  }

  @Get(':id/tobaccos')
  async findTobaccosByBrand(
    @Param('id') id: string,
    @Query() query: FindTobaccosDto,
  ) {
    return this.brandsService.findTobaccosByBrand(id, query);
  }
}
