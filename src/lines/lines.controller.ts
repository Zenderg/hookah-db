import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { LinesService } from './lines.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { FindLinesDto } from './dto/find-lines.dto';
import { FindTobaccosDto } from '../tobaccos/dto/find-tobaccos.dto';

@Controller('lines')
@UseGuards(ApiKeyGuard)
@UseInterceptors(LoggingInterceptor)
export class LinesController {
  constructor(private readonly linesService: LinesService) {}

  @Get()
  async findAll(@Query() query: FindLinesDto) {
    return this.linesService.findAll(query);
  }

  @Get('statuses')
  async getStatuses() {
    return this.linesService.getStatuses();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return this.linesService.findOne(id);
    } catch {
      throw new NotFoundException('Line not found');
    }
  }

  @Get(':id/tobaccos')
  async findTobaccosByLine(
    @Param('id') id: string,
    @Query() query: FindTobaccosDto,
  ) {
    return this.linesService.findTobaccosByLine(id, query);
  }
}
