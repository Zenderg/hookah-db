import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './brands.entity';
import { FindBrandsDto } from './dto/find-brands.dto';

@Injectable()
export class BrandsRepository {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  async findAll(query: FindBrandsDto): Promise<{ data: Brand[]; total: number }> {
    const { page = 1, limit = 20, sortBy = 'rating', order = 'desc', country, search, status } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.brandRepository.createQueryBuilder('brand');

    if (country) {
      queryBuilder.andWhere('brand.country = :country', { country });
    }

    if (search) {
      queryBuilder.andWhere('brand.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere('brand.status = :status', { status });
    }

    queryBuilder
      .orderBy(`brand.${sortBy}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Brand | null> {
    return this.brandRepository.findOne({ where: { id } });
  }

  async getCountries(): Promise<string[]> {
    const result = await this.brandRepository
      .createQueryBuilder('brand')
      .select('DISTINCT brand.country')
      .where('brand.country IS NOT NULL')
      .orderBy('brand.country', 'ASC')
      .getRawMany();

    return result.map((row: { country: string }) => row.country);
  }

  async getStatuses(): Promise<string[]> {
    const result = await this.brandRepository
      .createQueryBuilder('brand')
      .select('DISTINCT brand.status')
      .where('brand.status IS NOT NULL')
      .orderBy('brand.status', 'ASC')
      .getRawMany();

    return result.map((row: { status: string }) => row.status);
  }
}
