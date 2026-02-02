import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { TobaccosService } from './tobaccos.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { FindTobaccosDto } from './dto/find-tobaccos.dto';
import { FindTobaccoByUrlDto } from './dto/find-tobacco-by-url.dto';

@Controller('tobaccos')
@UseGuards(ApiKeyGuard)
@UseInterceptors(LoggingInterceptor)
export class TobaccosController {
  constructor(private readonly tobaccosService: TobaccosService) {}

  @Get()
  async findAll(@Query() query: FindTobaccosDto) {
    return this.tobaccosService.findAll(query);
  }

  @Get('statuses')
  async getStatuses() {
    return this.tobaccosService.getStatuses();
  }

  @Get('by-url')
  async findByUrl(@Query() dto: FindTobaccoByUrlDto) {
    return this.tobaccosService.findByUrl(dto.url);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return this.tobaccosService.findOne(id);
    } catch {
      throw new NotFoundException('Tobacco not found');
    }
  }
}
