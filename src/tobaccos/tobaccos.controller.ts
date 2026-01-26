import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TobaccosService } from './tobaccos.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';

@Controller('tobaccos')
@UseGuards(ApiKeyGuard)
@UseInterceptors(LoggingInterceptor)
export class TobaccosController {
  constructor(private readonly tobaccosService: TobaccosService) {}

  @Get()
  async findAll() {
    // TODO: Implement pagination, filtering, and sorting
    return this.tobaccosService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return this.tobaccosService.findOne(id);
    } catch (error) {
      throw new NotFoundException('Tobacco not found');
    }
  }
}
