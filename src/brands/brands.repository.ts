import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './brands.entity';
import { FindBrandsDto } from './dto/find-brands.dto';

const BRAND_SORT_FIELDS = {
  rating: 'brand.rating',
  name: 'brand.name',
} as const;

function getSortField(sortBy: unknown): string {
  if (
    typeof sortBy !== 'string' ||
    !Object.prototype.hasOwnProperty.call(BRAND_SORT_FIELDS, sortBy)
  ) {
    throw new BadRequestException('Unsupported brand sort field');
  }
  return BRAND_SORT_FIELDS[sortBy as keyof typeof BRAND_SORT_FIELDS];
}

function getSortOrder(order: unknown): 'ASC' | 'DESC' {
  if (order !== 'asc' && order !== 'desc') {
    throw new BadRequestException('Unsupported sort order');
  }
  return order.toUpperCase() as 'ASC' | 'DESC';
}

@Injectable()
export class BrandsRepository {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
  ) {}

  async findAll(
    query: FindBrandsDto,
  ): Promise<{ data: Brand[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'rating',
      order = 'desc',
      country,
      search,
      status,
    } = query;
    const skip = (page - 1) * limit;
    const sortField = getSortField(sortBy);
    const sortOrder = getSortOrder(order);

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

    queryBuilder.orderBy(sortField, sortOrder).skip(skip).take(limit);

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

  async getNames(): Promise<string[]> {
    const result = await this.brandRepository
      .createQueryBuilder('brand')
      .select('brand.name')
      .orderBy('brand.name', 'ASC')
      .getRawMany();

    return result.map((row: { brand_name: string }) => row.brand_name);
  }
}
