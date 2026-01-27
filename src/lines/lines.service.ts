import { Injectable } from '@nestjs/common';
import { LinesRepository } from './lines.repository';
import { Line } from './lines.entity';
import { FindLinesDto } from './dto/find-lines.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class LinesService {
  constructor(private readonly linesRepository: LinesRepository) {}

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
      throw new Error('Line not found');
    }
    return line;
  }
}
