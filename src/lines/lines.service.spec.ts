import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LinesService } from './lines.service';
import { LinesRepository } from './lines.repository';
import { TobaccosRepository } from '../tobaccos/tobaccos.repository';
import { FindLinesDto } from './dto/find-lines.dto';
import { FindTobaccosDto } from '../tobaccos/dto/find-tobaccos.dto';
import { Line } from './lines.entity';
import { Tobacco } from '../tobaccos/tobaccos.entity';

/* eslint-disable @typescript-eslint/unbound-method */
describe('LinesService', () => {
  let service: LinesService;
  let mockLinesRepository: jest.Mocked<LinesRepository>;
  let mockTobaccosRepository: jest.Mocked<TobaccosRepository>;

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

  const mockTobacco: Tobacco = {
    id: 'tobacco-1',
    name: 'Test Tobacco',
    slug: 'test-tobacco',
    brandId: 'brand-123',
    brand: null as any, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    lineId: mockLine.id,
    line: mockLine,
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
    // Create mock repositories
    mockLinesRepository = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      getStatuses: jest.fn(),
    } as unknown as jest.Mocked<LinesRepository>;

    mockTobaccosRepository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<TobaccosRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinesService,
        {
          provide: LinesRepository,
          useValue: mockLinesRepository,
        },
        {
          provide: TobaccosRepository,
          useValue: mockTobaccosRepository,
        },
      ],
    }).compile();

    service = module.get<LinesService>(LinesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated lines with default pagination', async () => {
      // Arrange
      const query: FindLinesDto = { page: 1, limit: 20 };
      const mockLines = [mockLine];
      mockLinesRepository.findAll.mockResolvedValue({
        data: mockLines,
        total: 1,
      });

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toEqual({
        data: mockLines,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      expect(mockLinesRepository.findAll).toHaveBeenCalledWith(query);
    });

    it('should calculate totalPages correctly', async () => {
      // Arrange
      const query: FindLinesDto = { page: 1, limit: 10 };
      const mockLines = Array.from({ length: 25 }, (_, i) => ({
        ...mockLine,
        id: `id-${i}`,
      }));
      mockLinesRepository.findAll.mockResolvedValue({
        data: mockLines,
        total: 25,
      });

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.meta.totalPages).toBe(3);
    });

    it('should handle empty results', async () => {
      // Arrange
      const query: FindLinesDto = { page: 1, limit: 20 };
      mockLinesRepository.findAll.mockResolvedValue({
        data: [],
        total: 0,
      });

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should pass all query parameters to repository', async () => {
      // Arrange
      const query: FindLinesDto = {
        page: 2,
        limit: 50,
        brandId: 'brand-123',
        search: 'test',
      };
      mockLinesRepository.findAll.mockResolvedValue({
        data: [],
        total: 0,
      });

      // Act
      await service.findAll(query);

      // Assert
      expect(mockLinesRepository.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return line when found', async () => {
      // Arrange
      const lineId = mockLine.id;
      mockLinesRepository.findOne.mockResolvedValue(mockLine);

      // Act
      const result = await service.findOne(lineId);

      // Assert
      expect(result).toEqual(mockLine);
      expect(mockLinesRepository.findOne).toHaveBeenCalledWith(lineId);
    });

    it('should throw NotFoundException when line not found', async () => {
      // Arrange
      const lineId = 'non-existent-id';
      mockLinesRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(lineId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(lineId)).rejects.toThrow('Line not found');
      expect(mockLinesRepository.findOne).toHaveBeenCalledWith(lineId);
    });
  });

  describe('findTobaccosByLine', () => {
    it('should return paginated tobaccos for line', async () => {
      // Arrange
      const lineId = mockLine.id;
      const query: FindTobaccosDto = { page: 1, limit: 20 };
      const mockTobaccos = [mockTobacco];
      mockLinesRepository.findOne.mockResolvedValue(mockLine);
      mockTobaccosRepository.findAll.mockResolvedValue({
        data: mockTobaccos,
        total: 1,
      });

      // Act
      const result = await service.findTobaccosByLine(lineId, query);

      // Assert
      expect(result).toEqual({
        data: mockTobaccos,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      expect(mockLinesRepository.findOne).toHaveBeenCalledWith(lineId);
      expect(mockTobaccosRepository.findAll).toHaveBeenCalledWith({
        ...query,
        lineId,
      });
    });

    it('should throw NotFoundException when line not found', async () => {
      // Arrange
      const lineId = 'non-existent-id';
      const query: FindTobaccosDto = { page: 1, limit: 20 };
      mockLinesRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findTobaccosByLine(lineId, query)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findTobaccosByLine(lineId, query)).rejects.toThrow(
        'Line not found',
      );
      expect(mockLinesRepository.findOne).toHaveBeenCalledWith(lineId);
      expect(mockTobaccosRepository.findAll).not.toHaveBeenCalled();
    });

    it('should calculate totalPages correctly for tobaccos', async () => {
      // Arrange
      const lineId = mockLine.id;
      const query: FindTobaccosDto = { page: 1, limit: 10 };
      const mockTobaccos = Array.from({ length: 25 }, (_, i) => ({
        ...mockTobacco,
        id: `tobacco-${i}`,
        name: `Tobacco ${i}`,
        lineId,
      }));
      mockLinesRepository.findOne.mockResolvedValue(mockLine);
      mockTobaccosRepository.findAll.mockResolvedValue({
        data: mockTobaccos,
        total: 25,
      });

      // Act
      const result = await service.findTobaccosByLine(lineId, query);

      // Assert
      expect(result.meta.totalPages).toBe(3);
    });

    it('should merge query with lineId when calling tobaccosRepository', async () => {
      // Arrange
      const lineId = mockLine.id;
      const query: FindTobaccosDto = {
        page: 2,
        limit: 15,
        sortBy: 'rating',
        order: 'desc',
        status: 'Выпускается',
      };
      mockLinesRepository.findOne.mockResolvedValue(mockLine);
      mockTobaccosRepository.findAll.mockResolvedValue({
        data: [],
        total: 0,
      });

      // Act
      await service.findTobaccosByLine(lineId, query);

      // Assert
      expect(mockTobaccosRepository.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 15,
        sortBy: 'rating',
        order: 'desc',
        status: 'Выпускается',
        lineId,
      });
    });
  });

  describe('getStatuses', () => {
    it('should return list of unique statuses', async () => {
      // Arrange
      const mockStatuses = [
        'Выпускается',
        'Лимитированная',
        'Снята с производства',
      ];
      mockLinesRepository.getStatuses.mockResolvedValue(mockStatuses);

      // Act
      const result = await service.getStatuses();

      // Assert
      expect(result).toEqual(mockStatuses);
      expect(mockLinesRepository.getStatuses).toHaveBeenCalled();
    });

    it('should return empty array when no statuses exist', async () => {
      // Arrange
      mockLinesRepository.getStatuses.mockResolvedValue([]);

      // Act
      const result = await service.getStatuses();

      // Assert
      expect(result).toEqual([]);
    });
  });
});
