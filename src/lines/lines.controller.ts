import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  NotFoundException,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { LinesService } from './lines.service';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { FindLinesDto } from './dto/find-lines.dto';
import { FindTobaccosDto } from '../tobaccos/dto/find-tobaccos.dto';

@Controller('lines')
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
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return this.linesService.findOne(id);
    } catch {
      throw new NotFoundException('Line not found');
    }
  }

  @Get(':id/tobaccos')
  async findTobaccosByLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: FindTobaccosDto,
  ) {
    return this.linesService.findTobaccosByLine(id, query);
  }
}
