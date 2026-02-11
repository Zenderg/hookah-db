import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { LinesRepository } from './lines.repository';
import { Line } from './lines.entity';
import { FindLinesDto } from './dto/find-lines.dto';

/* eslint-disable @typescript-eslint/unbound-method */
describe('LinesRepository', () => {
  let repository: LinesRepository;
  let mockLineRepository: jest.Mocked<Repository<Line>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Line>>;

  const mockLine: Line = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Line',
    slug: 'test-line',
    brandId: 'brand-123',
    brand: null as any, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    description: 'Test description',
    imageUrl: 'https://example.com/line.png',
    rating: 4.5,
    ratingsCount: 50,
    strengthOfficial: 'Средняя',
    strengthByRatings: 'Средняя',
    status: 'Выпускается',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    // Create mock query builder
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getRawMany: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Line>>;

    // Create mock repository
    mockLineRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Line>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinesRepository,
        {
          provide: getRepositoryToken(Line),
          useValue: mockLineRepository,
        },
      ],
    }).compile();

    repository = module.get<LinesRepository>(LinesRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated lines with default pagination', async () => {
      // Arrange
      const query: FindLinesDto = { page: 1, limit: 20 };
      const mockLines = [mockLine];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockLines, 1]);

      // Act
      const result = await repository.findAll(query);

      // Assert
      expect(result).toEqual({
        data: mockLines,
        total: 1,
      });
      expect(mockLineRepository.createQueryBuilder).toHaveBeenCalledWith(
        'line',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'line.brand',
        'brand',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('line.name', 'ASC');
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
    });

    it('should apply brandId filter', async () => {
      // Arrange
      const query: FindLinesDto = { brandId: 'brand-123' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockLine], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'line.brandId = :brandId',
        { brandId: 'brand-123' },
      );
    });

    it('should apply search filter with ILIKE', async () => {
      // Arrange
      const query: FindLinesDto = { search: 'test' };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockLine], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'line.name ILIKE :search',
        { search: '%test%' },
      );
    });

    it('should calculate skip correctly for pagination', async () => {
      // Arrange
      const query: FindLinesDto = { page: 3, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockLine], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20); // (3 - 1) * 10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should handle empty results', async () => {
      // Arrange
      const query: FindLinesDto = { page: 1, limit: 20 };
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
      const query: FindLinesDto = {
        page: 1,
        limit: 20,
        brandId: 'brand-123',
        search: 'test',
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockLine], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'line.brandId = :brandId',
        { brandId: 'brand-123' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'line.name ILIKE :search',
        { search: '%test%' },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('line.name', 'ASC');
    });

    it('should not apply optional filters when not provided', async () => {
      // Arrange
      const query: FindLinesDto = { page: 1, limit: 20 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockLine], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('line.name', 'ASC');
    });

    it('should use default pagination when not provided', async () => {
      // Arrange
      const query: FindLinesDto = {};
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockLine], 1]);

      // Act
      await repository.findAll(query);

      // Assert
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0); // (1 - 1) * 20
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });
  });

  describe('findOne', () => {
    it('should return line when found', async () => {
      // Arrange
      const lineId = mockLine.id;
      mockLineRepository.findOne.mockResolvedValue(mockLine);

      // Act
      const result = await repository.findOne(lineId);

      // Assert
      expect(result).toEqual(mockLine);
      expect(mockLineRepository.findOne).toHaveBeenCalledWith({
        where: { id: lineId },
        relations: ['brand'],
      });
    });

    it('should return null when line not found', async () => {
      // Arrange
      const lineId = 'non-existent-id';
      mockLineRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await repository.findOne(lineId);

      // Assert
      expect(result).toBeNull();
      expect(mockLineRepository.findOne).toHaveBeenCalledWith({
        where: { id: lineId },
        relations: ['brand'],
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
      expect(mockLineRepository.createQueryBuilder).toHaveBeenCalledWith(
        'line',
      );
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'DISTINCT line.status',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'line.status IS NOT NULL',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'line.status',
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
        'line.status IS NOT NULL',
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
        'line.status',
        'ASC',
      );
    });
  });
});
