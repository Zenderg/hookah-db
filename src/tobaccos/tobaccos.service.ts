import { Injectable } from '@nestjs/common';
import { TobaccosRepository } from './tobaccos.repository';
import { Tobacco } from './tobaccos.entity';

@Injectable()
export class TobaccosService {
  constructor(private readonly tobaccosRepository: TobaccosRepository) {}

  // TODO: Implement service methods
  async findAll(): Promise<Tobacco[]> {
    return this.tobaccosRepository.findAll();
  }

  async findOne(id: string): Promise<Tobacco> {
    const tobacco = await this.tobaccosRepository.findOne(id);
    if (!tobacco) {
      throw new Error('Tobacco not found');
    }
    return tobacco;
  }
}
