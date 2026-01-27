import { Injectable } from '@nestjs/common';
import { TobaccosRepository } from './tobaccos.repository';
import { Tobacco } from './tobaccos.entity';
import { FindTobaccosDto } from './dto/find-tobaccos.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class TobaccosService {
  constructor(private readonly tobaccosRepository: TobaccosRepository) {}

  async findAll(query: FindTobaccosDto): Promise<PaginatedResponseDto<Tobacco>> {
    const { data, total } = await this.tobaccosRepository.findAll(query);
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

  async findOne(id: string): Promise<Tobacco> {
    const tobacco = await this.tobaccosRepository.findOne(id);
    if (!tobacco) {
      throw new Error('Tobacco not found');
    }
    return tobacco;
  }
}
