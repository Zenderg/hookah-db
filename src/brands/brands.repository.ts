import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './brands.entity';

@Injectable()
export class BrandsRepository {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  // TODO: Implement repository methods
  async findAll(): Promise<Brand[]> {
    return this.brandRepository.find();
  }

  async findOne(id: string): Promise<Brand | null> {
    return this.brandRepository.findOne({ where: { id } });
  }
}
