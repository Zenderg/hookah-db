import { Injectable } from '@nestjs/common';
import { LinesRepository } from './lines.repository';
import { Line } from './lines.entity';

@Injectable()
export class LinesService {
  constructor(private readonly linesRepository: LinesRepository) {}

  // TODO: Implement service methods
  async findAll(): Promise<Line[]> {
    return this.linesRepository.findAll();
  }

  async findOne(id: string): Promise<Line> {
    const line = await this.linesRepository.findOne(id);
    if (!line) {
      throw new Error('Line not found');
    }
    return line;
  }
}
