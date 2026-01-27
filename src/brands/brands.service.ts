import { Injectable } from '@nestjs/common';
import { BrandsRepository } from './brands.repository';
import { Brand } from './brands.entity';
import { FindBrandsDto } from './dto/find-brands.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly brandsRepository: BrandsRepository) {}

  async findAll(query: FindBrandsDto): Promise<PaginatedResponseDto<Brand>> {
    const { data, total } = await this.brandsRepository.findAll(query);
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

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandsRepository.findOne(id);
    if (!brand) {
      throw new Error('Brand not found');
    }
    return brand;
  }
}
