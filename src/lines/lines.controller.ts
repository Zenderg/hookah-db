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

@Controller('lines')
@UseGuards(ApiKeyGuard)
@UseInterceptors(LoggingInterceptor)
export class LinesController {
  constructor(private readonly linesService: LinesService) {}

  @Get()
  async findAll(@Query() query: FindLinesDto) {
    return this.linesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return this.linesService.findOne(id);
    } catch (error) {
      throw new NotFoundException('Line not found');
    }
  }
}
