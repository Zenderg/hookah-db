import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TobaccosRepository } from './tobaccos.repository';
import { Tobacco } from './tobaccos.entity';
import { FindTobaccosDto } from './dto/find-tobaccos.dto';

/* eslint-disable @typescript-eslint/unbound-method */
describe('TobaccosRepository', () => {
  let repository: TobaccosRepository;
  let mockTobaccoRepository: jest.Mocked<Repository<Tobacco>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Tobacco>>;

  const mockTobacco: Tobacco = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Tobacco',
    slug: 'test-tobacco',
    brandId: 'brand-123',
    brand: null as any, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    lineId: null as any, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    line: null as any, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    rating: 4.5,
    ratingsCount: 50,
    strengthOfficial: 'Средняя',
    strengthByRatings: 'Средняя',
    status: 'Выпускается',
    htreviewsId: 'ht-123',
    imageUrl: 'https://example.com/tobacco.png',
    description: 'Test tobacco description',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    // Create mock query builder
    mockQueryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getRawMany: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Tobacco>>;

    // Create mock repository
    mockTobaccoRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Tobacco>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TobaccosRepository,
        {
          provide: getRepositoryToken(Tobacco),
          useValue: mockTobaccoRepository,
        },
      ],
    }).compile();

    repository = module.get<TobaccosRepository>(TobaccosRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated tobaccos with default pagination', async () => {
      // Arrange
      const query: FindTobaccosDto = { page: 1, limit: 20 };
      const mockTobaccos = [mockTobacco];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockTobaccos, 1]);

      // Act
      const result = await repository.findAll(query);

      // Assert
      expect(result).toEqual({
        data: mockTobaccos,
        total: 1,
      });
      expect(mockTobaccoRepository.createQueryBuilder).toHaveBeenCalledWith(
        'tobacco',
      );
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'tobacco.brand',
        'brand',
      );
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'tobacco.line',
        'line',
      );
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('tobacco');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'tobacco.rating',
        'DESC',
      );
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
    });

    it('should apply brandId filter', async () => {
      // Arrange
      const query: FindTobaccosDto = { brandId: 'brand-123' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tobacco.brandId = :brandId',
        { brandId: 'brand-123' },
      );
    });

    it('should apply lineId filter', async () => {
      // Arrange
      const query: FindTobaccosDto = { lineId: 'line-456' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tobacco.lineId = :lineId',
        { lineId: 'line-456' },
      );
    });

    it('should apply minRating filter', async () => {
      // Arrange
      const query: FindTobaccosDto = { minRating: 3 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tobacco.rating >= :minRating',
        { minRating: 3 },
      );
    });

    it('should apply maxRating filter', async () => {
      // Arrange
      const query: FindTobaccosDto = { maxRating: 5 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tobacco.rating <= :maxRating',
        { maxRating: 5 },
      );
    });

    it('should apply both minRating and maxRating filters', async () => {
      // Arrange
      const query: FindTobaccosDto = { minRating: 3, maxRating: 5 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tobacco.rating >= :minRating',
        { minRating: 3 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tobacco.rating <= :maxRating',
        { maxRating: 5 },
      );
    });

    it('should apply country filter using brand join', async () => {
      // Arrange
      const query: FindTobaccosDto = { country: 'Россия' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'brand.country = :country',
        { country: 'Россия' },
      );
    });

    it('should apply status filter', async () => {
      // Arrange
      const query: FindTobaccosDto = { status: 'Выпускается' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tobacco.status = :status',
        { status: 'Выпускается' },
      );
    });

    it('should apply search filter with full-text search', async () => {
      // Arrange
      const query: FindTobaccosDto = { search: 'test' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert - check that andWhere was called with the search query
      const searchCall = mockQueryBuilder.andWhere.mock.calls.find((call) => {
        const whereClause = call[0] as string;
        return (
          whereClause?.includes('to_tsvector') &&
          whereClause?.includes('to_tsquery')
        );
      });
      expect(searchCall).toBeDefined();
      expect(mockQueryBuilder.addSelect).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'relevance',
        'DESC',
      );
    });

    it('should apply custom sortBy and order', async () => {
      // Arrange
      const query: FindTobaccosDto = { sortBy: 'name', order: 'asc' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'tobacco.name',
        'ASC',
      );
    });

    it('should calculate skip correctly for pagination', async () => {
      // Arrange
      const query: FindTobaccosDto = { page: 3, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20); // (3 - 1) * 10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should handle empty results', async () => {
      // Arrange
      const query: FindTobaccosDto = { page: 1, limit: 20 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      // Act
      const result = await repository.findAll(query);

      // Assert
      expect(result).toEqual({
        data: [],
        total: 0,
      });
    });

    it('should apply all filters together', async () => {
      // Arrange
      const query: FindTobaccosDto = {
        page: 1,
        limit: 20,
        sortBy: 'rating',
        order: 'desc',
        brandId: 'brand-123',
        lineId: 'line-456',
        minRating: 3,
        maxRating: 5,
        country: 'Россия',
        status: 'Выпускается',
        search: 'test',
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'tobacco.brand',
        'brand',
      );
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'tobacco.line',
        'line',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tobacco.brandId = :brandId',
        { brandId: 'brand-123' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tobacco.lineId = :lineId',
        { lineId: 'line-456' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tobacco.rating >= :minRating',
        { minRating: 3 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tobacco.rating <= :maxRating',
        { maxRating: 5 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'brand.country = :country',
        { country: 'Россия' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tobacco.status = :status',
        { status: 'Выпускается' },
      );
      // Assert - check that search WHERE clause was called
      const searchCall = mockQueryBuilder.andWhere.mock.calls.find((call) => {
        const whereClause = call[0] as string;
        return (
          whereClause?.includes('to_tsvector') &&
          whereClause?.includes('to_tsquery')
        );
      });
      expect(searchCall).toBeDefined();
      expect(mockQueryBuilder.addSelect).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'relevance',
        'DESC',
      );
    });

    it('should not apply optional filters when not provided', async () => {
      // Arrange
      const query: FindTobaccosDto = { page: 1, limit: 20 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'tobacco.rating',
        'DESC',
      );
    });

    it('should use default sortBy and order when not provided', async () => {
      // Arrange
      const query: FindTobaccosDto = {};
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'tobacco.rating',
        'DESC',
      );
    });

    // Tests for improved search with prefix matching and ranking
    it('should apply prefix search with ILIKE for partial word matches', async () => {
      // Arrange
      const query: FindTobaccosDto = { search: 'col' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert - check that ILIKE conditions are present
      const searchCall = mockQueryBuilder.andWhere.mock.calls.find((call) => {
        const whereClause = call[0] as string;
        return (
          whereClause?.includes('LOWER(tobacco.name) LIKE LOWER') ||
          whereClause?.includes('LOWER(brand.name) LIKE LOWER') ||
          whereClause?.includes('LOWER(line.name) LIKE LOWER')
        );
      });
      expect(searchCall).toBeDefined();
    });

    it('should use FTS prefix operator (:*) for stemming support', async () => {
      // Arrange
      const query: FindTobaccosDto = { search: 'cola' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert - check that setParameter was called with values containing :*
      const hasPrefixParam = mockQueryBuilder.setParameter.mock.calls.some(
        (call) => {
          const value = call[1] as string;
          return value?.includes(':*');
        },
      );
      expect(hasPrefixParam).toBe(true);
    });

    it('should calculate exact match bonus for tobacco name', async () => {
      // Arrange
      const query: FindTobaccosDto = { search: 'Test Tobacco' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert - check that addSelect was called with relevance score
      expect(mockQueryBuilder.addSelect).toHaveBeenCalled();
      const addSelectCall = mockQueryBuilder.addSelect.mock.calls[0];
      expect(addSelectCall).toBeDefined();
      expect(addSelectCall[0]).toContain(
        'CASE WHEN LOWER(tobacco.name) = LOWER',
      );
      expect(addSelectCall[0]).toContain('THEN 100 ELSE 0 END');
    });

    it('should calculate prefix match bonus for tobacco name', async () => {
      // Arrange
      const query: FindTobaccosDto = { search: 'Test' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert - check that prefix match bonus is calculated
      expect(mockQueryBuilder.addSelect).toHaveBeenCalled();
      const addSelectCall = mockQueryBuilder.addSelect.mock.calls[0];
      expect(addSelectCall[0]).toContain(
        'CASE WHEN LOWER(tobacco.name) LIKE LOWER',
      );
      expect(addSelectCall[0]).toContain('THEN 50 ELSE 0 END');
    });

    it('should calculate prefix match bonus for brand name', async () => {
      // Arrange
      const query: FindTobaccosDto = { search: 'Test' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert - check that brand prefix match bonus is calculated
      expect(mockQueryBuilder.addSelect).toHaveBeenCalled();
      const addSelectCall = mockQueryBuilder.addSelect.mock.calls[0];
      expect(addSelectCall[0]).toContain(
        'CASE WHEN LOWER(brand.name) LIKE LOWER',
      );
      expect(addSelectCall[0]).toContain('THEN 30 ELSE 0 END');
    });

    it('should calculate prefix match bonus for line name', async () => {
      // Arrange
      const query: FindTobaccosDto = { search: 'Test' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert - check that line prefix match bonus is calculated
      expect(mockQueryBuilder.addSelect).toHaveBeenCalled();
      const addSelectCall = mockQueryBuilder.addSelect.mock.calls[0];
      expect(addSelectCall[0]).toContain(
        'CASE WHEN LOWER(line.name) LIKE LOWER',
      );
      expect(addSelectCall[0]).toContain('THEN 30 ELSE 0 END');
    });

    it('should handle multi-word search with cross-field AND logic', async () => {
      // Arrange
      const query: FindTobaccosDto = { search: 'cola darks' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert - check that multiple andWhere calls are made (one per word)
      const searchCalls = mockQueryBuilder.andWhere.mock.calls.filter(
        (call) => {
          const whereClause = call[0] as string;
          return (
            whereClause?.includes('to_tsvector') ||
            whereClause?.includes('LOWER') ||
            whereClause?.includes('LIKE')
          );
        },
      );
      // Should have at least 2 search calls (one for each word)
      expect(searchCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should combine base relevance with bonuses for final ranking', async () => {
      // Arrange
      const query: FindTobaccosDto = { search: 'test' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert - check that final score combines all components
      expect(mockQueryBuilder.addSelect).toHaveBeenCalled();
      const addSelectCall = mockQueryBuilder.addSelect.mock.calls[0];
      // Should contain base relevance (ts_rank)
      expect(addSelectCall[0]).toContain('ts_rank');
      // Should contain exact match bonus (100)
      expect(addSelectCall[0]).toContain('100');
      // Should contain prefix match bonuses (50, 30)
      expect(addSelectCall[0]).toContain('50');
      expect(addSelectCall[0]).toContain('30');
    });

    it('should set parameters for prefix and exact match calculations', async () => {
      // Arrange
      const query: FindTobaccosDto = { search: 'test' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert - check that setParameter is called with correct values
      expect(mockQueryBuilder.setParameter).toHaveBeenCalled();
      const setParamCalls = mockQueryBuilder.setParameter.mock.calls;
      // Should have parameters for prefix search (test%)
      const hasPrefixParam = setParamCalls.some((call) => {
        return call[1] === 'test%';
      });
      expect(hasPrefixParam).toBe(true);
    });

    it('should handle case-insensitive search', async () => {
      // Arrange
      const query: FindTobaccosDto = { search: 'TEST' }; // uppercase
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert - check that LOWER() is used for case-insensitive matching
      const searchCall = mockQueryBuilder.andWhere.mock.calls.find((call) => {
        const whereClause = call[0] as string;
        return whereClause?.includes('LOWER');
      });
      expect(searchCall).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return tobacco when found', async () => {
      // Arrange
      const tobaccoId = mockTobacco.id;
      mockTobaccoRepository.findOne.mockResolvedValue(mockTobacco);

      // Act
      const result = await repository.findOne(tobaccoId);

      // Assert
      expect(result).toEqual(mockTobacco);
      expect(mockTobaccoRepository.findOne).toHaveBeenCalledWith({
        where: { id: tobaccoId },
      });
    });

    it('should return null when tobacco not found', async () => {
      // Arrange
      const tobaccoId = 'non-existent-id';
      mockTobaccoRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await repository.findOne(tobaccoId);

      // Assert
      expect(result).toBeNull();
      expect(mockTobaccoRepository.findOne).toHaveBeenCalledWith({
        where: { id: tobaccoId },
      });
    });
  });

  describe('findBySlug', () => {
    it('should return tobacco when found by slug', async () => {
      // Arrange
      const slug = mockTobacco.slug;
      mockTobaccoRepository.findOne.mockResolvedValue(mockTobacco);

      // Act
      const result = await repository.findBySlug(slug);

      // Assert
      expect(result).toEqual(mockTobacco);
      expect(mockTobaccoRepository.findOne).toHaveBeenCalledWith({
        where: { slug },
      });
    });

    it('should return null when tobacco not found by slug', async () => {
      // Arrange
      const slug = 'non-existent-slug';
      mockTobaccoRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await repository.findBySlug(slug);

      // Assert
      expect(result).toBeNull();
      expect(mockTobaccoRepository.findOne).toHaveBeenCalledWith({
        where: { slug },
      });
    });
  });

  describe('getStatuses', () => {
    it('should return list of unique statuses', async () => {
      // Arrange
      const mockRawResult = [
        { status: 'Выпускается' },
        { status: 'Лимитированная' },
        { status: 'Снята с производства' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(mockRawResult as any);

      // Act
      const result = await repository.getStatuses();

      // Assert
      expect(result).toEqual([
        'Выпускается',
        'Лимитированная',
        'Снята с производства',
      ]);
      expect(mockTobaccoRepository.createQueryBuilder).toHaveBeenCalledWith(
        'tobacco',
      );
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'DISTINCT tobacco.status',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'tobacco.status IS NOT NULL',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'tobacco.status',
        'ASC',
      );
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalled();
    });

    it('should return empty array when no statuses exist', async () => {
      // Arrange
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await repository.getStatuses();

      // Assert
      expect(result).toEqual([]);
    });

    it('should filter out NULL status values', async () => {
      // Arrange
      const mockRawResult = [
        { status: 'Выпускается' },
        { status: 'Лимитированная' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(mockRawResult as any);

      // Act
      const result = await repository.getStatuses();

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'tobacco.status IS NOT NULL',
      );
      expect(result).toEqual(['Выпускается', 'Лимитированная']);
    });

    it('should order statuses alphabetically', async () => {
      // Arrange
      const mockRawResult = [
        { status: 'Снята с производства' },
        { status: 'Выпускается' },
        { status: 'Лимитированная' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(mockRawResult as any);

      // Act
      await repository.getStatuses();

      // Assert
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'tobacco.status',
        'ASC',
      );
    });
  });
});
