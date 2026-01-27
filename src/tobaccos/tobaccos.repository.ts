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

  async findAll(query: FindTobaccosDto): Promise<{ data: Tobacco[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'rating',
      order = 'desc',
      brandId,
      lineId,
      category,
      minRating,
      maxRating,
      year,
      country,
      productionStatus,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tobaccoRepository.createQueryBuilder('tobacco');

    if (brandId) {
      queryBuilder.andWhere('tobacco.brandId = :brandId', { brandId });
    }

    if (lineId) {
      queryBuilder.andWhere('tobacco.lineId = :lineId', { lineId });
    }

    if (category) {
      queryBuilder.andWhere('tobacco.category = :category', { category });
    }

    if (minRating !== undefined) {
      queryBuilder.andWhere('tobacco.rating >= :minRating', { minRating });
    }

    if (maxRating !== undefined) {
      queryBuilder.andWhere('tobacco.rating <= :maxRating', { maxRating });
    }

    if (year) {
      queryBuilder.andWhere('tobacco.year = :year', { year });
    }

    if (country) {
      queryBuilder.andWhere('tobacco.country = :country', { country });
    }

    if (productionStatus) {
      queryBuilder.andWhere('tobacco.productionStatus = :productionStatus', {
        productionStatus,
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
}
