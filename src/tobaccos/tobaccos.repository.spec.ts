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
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
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

    it('should apply search filter with ILIKE', async () => {
      // Arrange
      const query: FindTobaccosDto = { search: 'test' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTobacco], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tobacco.name ILIKE :search',
        { search: '%test%' },
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
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tobacco.name ILIKE :search',
        { search: '%test%' },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'tobacco.rating',
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
