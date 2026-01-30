import { Injectable, NotFoundException } from '@nestjs/common';
import { LinesRepository } from './lines.repository';
import { Line } from './lines.entity';
import { FindLinesDto } from './dto/find-lines.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { TobaccosRepository } from '../tobaccos/tobaccos.repository';
import { FindTobaccosDto } from '../tobaccos/dto/find-tobaccos.dto';

@Injectable()
export class LinesService {
  constructor(
    private readonly linesRepository: LinesRepository,
    private readonly tobaccosRepository: TobaccosRepository,
  ) {}

  async findAll(query: FindLinesDto): Promise<PaginatedResponseDto<Line>> {
    const { data, total } = await this.linesRepository.findAll(query);
    const { page = 1, limit = 20 } = query;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string): Promise<Line> {
    const line = await this.linesRepository.findOne(id);
    if (!line) {
      throw new NotFoundException('Line not found');
    }
    return line;
  }

  async findTobaccosByLine(
    lineId: string,
    query: FindTobaccosDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const line = await this.linesRepository.findOne(lineId);
    if (!line) {
      throw new NotFoundException('Line not found');
    }

    const { data, total } = await this.tobaccosRepository.findAll({
      ...query,
      lineId,
    });
    const { page = 1, limit = 20 } = query;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
