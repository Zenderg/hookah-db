import { Injectable } from '@nestjs/common';
import { BrandsRepository } from './brands.repository';
import { Brand } from './brands.entity';
import { FindBrandsDto } from './dto/find-brands.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import { TobaccosRepository } from '../tobaccos/tobaccos.repository';
import { FindTobaccosDto } from '../tobaccos/dto/find-tobaccos.dto';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class BrandsService {
  constructor(
    private readonly brandsRepository: BrandsRepository,
    private readonly tobaccosRepository: TobaccosRepository,
  ) {}

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
      throw new NotFoundException('Brand not found');
    }
    return brand;
  }

  async findTobaccosByBrand(
    brandId: string,
    query: FindTobaccosDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const brand = await this.brandsRepository.findOne(brandId);
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    const { data, total } = await this.tobaccosRepository.findAll({
      ...query,
      brandId,
    });
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

  async getCountries(): Promise<string[]> {
    return this.brandsRepository.getCountries();
  }

  async getStatuses(): Promise<string[]> {
    return this.brandsRepository.getStatuses();
  }
}
