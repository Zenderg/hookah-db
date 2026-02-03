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

    // Join with brands table for country filtering and search
    queryBuilder.leftJoin('tobacco.brand', 'brand');

    // Join with lines table for search
    queryBuilder.leftJoin('tobacco.line', 'line');

    // Select tobacco columns only (brand and line are joined only for filtering/search)
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
      // Use PostgreSQL Full-Text Search with Russian and English configurations
      // Search across tobacco.name, brand.name, and line.name
      // For multi-word searches, each word must match in at least one field (cross-field AND)
      const searchWords = search.trim().split(/\s+/);

      // For each search word, create a condition that it must match in ANY field
      searchWords.forEach((word, index) => {
        const paramName = `searchWord${index}`;
        queryBuilder.andWhere(
          `(
            to_tsvector('russian', tobacco.name) @@ to_tsquery('russian', :${paramName}) OR
             to_tsvector('english', tobacco.name) @@ to_tsquery('english', :${paramName}) OR
            to_tsvector('russian', brand.name) @@ to_tsquery('russian', :${paramName}) OR
             to_tsvector('english', brand.name) @@ to_tsquery('english', :${paramName}) OR
            to_tsvector('russian', line.name) @@ to_tsquery('russian', :${paramName}) OR
             to_tsvector('english', line.name) @@ to_tsquery('english', :${paramName})
          )`,
          { [paramName]: word },
        );
      });

      // Calculate relevance ranking
      // Combines rankings from both language configurations across all fields
      // Use COALESCE to handle NULL values from line.name (lineId can be null)
      const relevanceExpressions = searchWords.map((word, index) => {
        const paramName = `searchWord${index}`;
        return `(
          ts_rank(to_tsvector('russian', tobacco.name), to_tsquery('russian', :${paramName})) +
          ts_rank(to_tsvector('english', tobacco.name), to_tsquery('english', :${paramName})) +
          ts_rank(to_tsvector('russian', brand.name), to_tsquery('russian', :${paramName})) +
          ts_rank(to_tsvector('english', brand.name), to_tsquery('english', :${paramName})) +
          ts_rank(to_tsvector('russian', line.name), to_tsquery('russian', :${paramName})) +
          ts_rank(to_tsvector('english', line.name), to_tsquery('english', :${paramName}))
        )`;
      });

      queryBuilder.addSelect(
        `COALESCE(${relevanceExpressions.join(' + ')}, 0)`,
        'relevance',
      );

      // Sort by relevance when search is provided (override sortBy parameter)
      queryBuilder.orderBy('relevance', 'DESC');
    } else {
      // Use normal sorting when no search is provided
      queryBuilder.orderBy(
        `tobacco.${sortBy}`,
        order.toUpperCase() as 'ASC' | 'DESC',
      );
    }

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Tobacco | null> {
    return this.tobaccoRepository.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Tobacco | null> {
    return this.tobaccoRepository.findOne({ where: { slug } });
  }

  async findBySlugs(
    brandSlug: string,
    lineSlug: string,
    tobaccoSlug: string,
  ): Promise<Tobacco | null> {
    const queryBuilder = this.tobaccoRepository.createQueryBuilder('tobacco');

    queryBuilder
      .leftJoin('tobacco.brand', 'brand')
      .leftJoin('tobacco.line', 'line')
      .where('brand.slug = :brandSlug', { brandSlug })
      .andWhere('line.slug = :lineSlug', { lineSlug })
      .andWhere('tobacco.slug = :tobaccoSlug', { tobaccoSlug });

    return queryBuilder.getOne();
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
