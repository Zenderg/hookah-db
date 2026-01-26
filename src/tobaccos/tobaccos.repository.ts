import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tobacco } from './tobaccos.entity';

@Injectable()
export class TobaccosRepository {
  constructor(
    @InjectRepository(Tobacco)
    private readonly tobaccoRepository: Repository<Tobacco>,
  ) {}

  // TODO: Implement repository methods
  async findAll(): Promise<Tobacco[]> {
    return this.tobaccoRepository.find();
  }

  async findOne(id: string): Promise<Tobacco | null> {
    return this.tobaccoRepository.findOne({ where: { id } });
  }
}
