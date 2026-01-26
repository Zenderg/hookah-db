import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Line } from './lines.entity';

@Injectable()
export class LinesRepository {
  constructor(
    @InjectRepository(Line)
    private readonly lineRepository: Repository<Line>,
  ) {}

  // TODO: Implement repository methods
  async findAll(): Promise<Line[]> {
    return this.lineRepository.find();
  }

  async findOne(id: string): Promise<Line | null> {
    return this.lineRepository.findOne({ where: { id } });
  }
}
