import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tobacco } from './tobaccos.entity';
import { FindTobaccosDto } from './dto/find-tobaccos.dto';

@Injectable()
export class TobaccosRepository {
  constructor(
    @InjectRepository(Tobacco)
    private readonly tobaccoRepository: Repository<Tobacco>,
  ) {}

  async findAll(
    query: FindTobaccosDto,
  ): Promise<{ data: Tobacco[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'rating',
      order = 'desc',
      brandId,
      lineId,
      minRating,
      maxRating,
      country,
      status,
      search,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tobaccoRepository.createQueryBuilder('tobacco');

    // Join with brands table for country filtering
    queryBuilder.leftJoin('tobacco.brand', 'brand');

    // Select tobacco columns only (brand is joined only for filtering)
    queryBuilder.select('tobacco');

    if (brandId) {
      queryBuilder.andWhere('tobacco.brandId = :brandId', { brandId });
    }

    if (lineId) {
      queryBuilder.andWhere('tobacco.lineId = :lineId', { lineId });
    }

    if (minRating !== undefined) {
      queryBuilder.andWhere('tobacco.rating >= :minRating', { minRating });
    }

    if (maxRating !== undefined) {
      queryBuilder.andWhere('tobacco.rating <= :maxRating', { maxRating });
    }

    if (country) {
      queryBuilder.andWhere('brand.country = :country', { country });
    }

    if (status) {
      queryBuilder.andWhere('tobacco.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere('tobacco.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    queryBuilder
      .orderBy(`tobacco.${sortBy}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Tobacco | null> {
    return this.tobaccoRepository.findOne({ where: { id } });
  }

  async getStatuses(): Promise<string[]> {
    const result = await this.tobaccoRepository
      .createQueryBuilder('tobacco')
      .select('DISTINCT tobacco.status')
      .where('tobacco.status IS NOT NULL')
      .orderBy('tobacco.status', 'ASC')
      .getRawMany();

    return result.map((row: { status: string }) => row.status);
  }
}
