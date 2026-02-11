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
      flavors,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tobaccoRepository.createQueryBuilder('tobacco');

    queryBuilder.leftJoinAndSelect('tobacco.brand', 'brand');
    queryBuilder.leftJoinAndSelect('tobacco.line', 'line');
    queryBuilder.leftJoinAndSelect('tobacco.flavors', 'tobaccoFlavor');

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

    // Filter by flavors (AND logic: tobacco must have ALL selected flavors)
    if (flavors && flavors.length > 0) {
      // Use a subquery to find tobaccos that have ALL requested flavors
      queryBuilder.andWhere(
        `tobacco.id IN (
          SELECT tf."tobaccoId"
          FROM tobacco_flavors tf
          INNER JOIN flavors f ON f.id = tf."flavorId"
          WHERE f.name IN (:...flavorNames)
          GROUP BY tf."tobaccoId"
          HAVING COUNT(DISTINCT f.id) = :flavorsCount
        )`,
        { flavorNames: flavors, flavorsCount: flavors.length },
      );
    }

    if (search) {
      // Use PostgreSQL Full-Text Search with Russian and English configurations
      // Search across tobacco.name, brand.name, and line.name
      // For multi-word searches, each word must match in at least one field (cross-field AND)
      const searchWords = search.trim().split(/\s+/);

      // Build parameters object for all search words
      const searchParams: Record<string, string> = {};

      // For each search word, create conditions for:
      // 1. Full-Text Search with prefix operator (:*) for stemming support
      // 2. ILIKE for exact prefix matching (case-insensitive)
      searchWords.forEach((word, index) => {
        const paramNamePrefix = `searchWordPrefix${index}`;
        const paramNameILike = `searchWordILike${index}`;

        searchParams[paramNamePrefix] = `${word}:*`;
        searchParams[paramNameILike] = `${word}%`;

        queryBuilder.andWhere(
          `(
            to_tsvector('russian', tobacco.name) @@ to_tsquery('russian', :${paramNamePrefix}) OR
             to_tsvector('english', tobacco.name) @@ to_tsquery('english', :${paramNamePrefix}) OR
            to_tsvector('russian', brand.name) @@ to_tsquery('russian', :${paramNamePrefix}) OR
             to_tsvector('english', brand.name) @@ to_tsquery('english', :${paramNamePrefix}) OR
            to_tsvector('russian', line.name) @@ to_tsquery('russian', :${paramNamePrefix}) OR
             to_tsvector('english', line.name) @@ to_tsquery('english', :${paramNamePrefix}) OR
            LOWER(tobacco.name) LIKE LOWER(:${paramNameILike}) OR
            LOWER(brand.name) LIKE LOWER(:${paramNameILike}) OR
            LOWER(line.name) LIKE LOWER(:${paramNameILike})
          )`,
        );
      });

      // Calculate base relevance ranking from Full-Text Search
      // Combines rankings from both language configurations across all fields
      // Use COALESCE to handle NULL values from line.name (lineId can be null)
      const relevanceExpressions = searchWords.map((_, index) => {
        const paramNamePrefix = `searchWordPrefix${index}`;
        return `(
          ts_rank(to_tsvector('russian', tobacco.name), to_tsquery('russian', :${paramNamePrefix})) +
          ts_rank(to_tsvector('english', tobacco.name), to_tsquery('english', :${paramNamePrefix})) +
          ts_rank(to_tsvector('russian', brand.name), to_tsquery('russian', :${paramNamePrefix})) +
          ts_rank(to_tsvector('english', brand.name), to_tsquery('english', :${paramNamePrefix})) +
          ts_rank(to_tsvector('russian', line.name), to_tsquery('russian', :${paramNamePrefix})) +
          ts_rank(to_tsvector('english', line.name), to_tsquery('english', :${paramNamePrefix}))
        )`;
      });

      // Calculate bonuses for exact matches and prefix matches
      // Bonus weights:
      // - Exact match of tobacco.name: +100
      // - Prefix match at start of tobacco.name: +50
      // - Prefix match at start of brand.name: +30
      // - Prefix match at start of line.name: +30
      const exactMatchBonus = searchWords.map((word, index) => {
        const paramName = `searchWordExact${index}`;
        searchParams[paramName] = word;
        return `CASE WHEN LOWER(tobacco.name) = LOWER(:${paramName}) THEN 100 ELSE 0 END`;
      });

      const prefixMatchBonus = searchWords.map((_, index) => {
        const paramName = `searchWordILike${index}`;
        return `(
          CASE WHEN LOWER(tobacco.name) LIKE LOWER(:${paramName}) THEN 50 ELSE 0 END +
          CASE WHEN LOWER(brand.name) LIKE LOWER(:${paramName}) THEN 30 ELSE 0 END +
          CASE WHEN LOWER(line.name) LIKE LOWER(:${paramName}) THEN 30 ELSE 0 END
        )`;
      });

      // Combine all expressions into final ranking score
      // Final score = base relevance + exact match bonuses + prefix match bonuses
      queryBuilder.addSelect(
        `COALESCE(${relevanceExpressions.join(' + ')}, 0) + ${exactMatchBonus.join(' + ')} + ${prefixMatchBonus.join(' + ')}`,
        'relevance',
      );

      // Set all parameters
      Object.entries(searchParams).forEach(([key, value]) => {
        queryBuilder.setParameter(key, value);
      });

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
    return this.tobaccoRepository.findOne({
      where: { id },
      relations: ['brand', 'line', 'flavors'],
    });
  }

  async findBySlug(slug: string): Promise<Tobacco | null> {
    return this.tobaccoRepository.findOne({
      where: { slug },
      relations: ['brand', 'line', 'flavors'],
    });
  }

  async findBySlugs(
    brandSlug: string,
    lineSlug: string,
    tobaccoSlug: string,
  ): Promise<Tobacco | null> {
    const queryBuilder = this.tobaccoRepository.createQueryBuilder('tobacco');

    queryBuilder
      .leftJoinAndSelect('tobacco.brand', 'brand')
      .leftJoinAndSelect('tobacco.line', 'line')
      .leftJoinAndSelect('tobacco.flavors', 'flavor')
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
