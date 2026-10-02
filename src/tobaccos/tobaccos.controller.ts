import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { TobaccosService } from './tobaccos.service';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { FindTobaccosDto } from './dto/find-tobaccos.dto';
import { FindTobaccoByUrlDto } from './dto/find-tobacco-by-url.dto';

@Controller('tobaccos')
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
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tobaccosService.findOne(id);
  }
}
