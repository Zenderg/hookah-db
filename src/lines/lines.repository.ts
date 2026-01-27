import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Line } from './lines.entity';
import { FindLinesDto } from './dto/find-lines.dto';

@Injectable()
export class LinesRepository {
  constructor(
    @InjectRepository(Line)
    private readonly lineRepository: Repository<Line>,
  ) {}

  async findAll(query: FindLinesDto): Promise<{ data: Line[]; total: number }> {
    const { page = 1, limit = 20, brandId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.lineRepository.createQueryBuilder('line');

    if (brandId) {
      queryBuilder.andWhere('line.brandId = :brandId', { brandId });
    }

    queryBuilder
      .orderBy('line.name', 'ASC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Line | null> {
    return this.lineRepository.findOne({ where: { id } });
  }
}
