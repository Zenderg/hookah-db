import { Injectable } from '@nestjs/common';
import { BrandsRepository } from './brands.repository';
import { Brand } from './brands.entity';

@Injectable()
export class BrandsService {
  constructor(private readonly brandsRepository: BrandsRepository) {}

  // TODO: Implement service methods
  async findAll(): Promise<Brand[]> {
    return this.brandsRepository.findAll();
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandsRepository.findOne(id);
    if (!brand) {
      throw new Error('Brand not found');
    }
    return brand;
  }
}
