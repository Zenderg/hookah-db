import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TobaccosService } from './tobaccos.service';
import { TobaccosRepository } from './tobaccos.repository';
import { FindTobaccosDto } from './dto/find-tobaccos.dto';
import { Tobacco } from './tobaccos.entity';

/* eslint-disable @typescript-eslint/unbound-method */
describe('TobaccosService', () => {
  let service: TobaccosService;
  let mockTobaccosRepository: jest.Mocked<TobaccosRepository>;

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
    // Create mock repository
    mockTobaccosRepository = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findBySlug: jest.fn(),
      findBySlugs: jest.fn(),
      getStatuses: jest.fn(),
    } as unknown as jest.Mocked<TobaccosRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TobaccosService,
        {
          provide: TobaccosRepository,
          useValue: mockTobaccosRepository,
        },
      ],
    }).compile();

    service = module.get<TobaccosService>(TobaccosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated tobaccos with default pagination', async () => {
      // Arrange
      const query: FindTobaccosDto = { page: 1, limit: 20 };
      const mockTobaccos = [mockTobacco];
      mockTobaccosRepository.findAll.mockResolvedValue({
        data: mockTobaccos,
        total: 1,
      });

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toEqual({
        data: mockTobaccos,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      expect(mockTobaccosRepository.findAll).toHaveBeenCalledWith(query);
    });

    it('should calculate totalPages correctly', async () => {
      // Arrange
      const query: FindTobaccosDto = { page: 1, limit: 10 };
      const mockTobaccos = Array.from({ length: 25 }, (_, i) => ({
        ...mockTobacco,
        id: `id-${i}`,
      }));
      mockTobaccosRepository.findAll.mockResolvedValue({
        data: mockTobaccos,
        total: 25,
      });

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.meta.totalPages).toBe(3);
    });

    it('should handle empty results', async () => {
      // Arrange
      const query: FindTobaccosDto = { page: 1, limit: 20 };
      mockTobaccosRepository.findAll.mockResolvedValue({
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
      const query: FindTobaccosDto = {
        page: 2,
        limit: 50,
        sortBy: 'rating',
        order: 'asc',
        brandId: 'brand-123',
        lineId: 'line-456',
        minRating: 3,
        maxRating: 5,
        country: 'Россия',
        status: 'Выпускается',
        search: 'test',
      };
      mockTobaccosRepository.findAll.mockResolvedValue({
        data: [],
        total: 0,
      });

      // Act
      await service.findAll(query);

      // Assert
      expect(mockTobaccosRepository.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return tobacco when found', async () => {
      // Arrange
      const tobaccoId = mockTobacco.id;
      mockTobaccosRepository.findOne.mockResolvedValue(mockTobacco);

      // Act
      const result = await service.findOne(tobaccoId);

      // Assert
      expect(result).toEqual(mockTobacco);
      expect(mockTobaccosRepository.findOne).toHaveBeenCalledWith(tobaccoId);
    });

    it('should throw Error when tobacco not found', async () => {
      // Arrange
      const tobaccoId = 'non-existent-id';
      mockTobaccosRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(tobaccoId)).rejects.toThrow(
        'Tobacco not found',
      );
      expect(mockTobaccosRepository.findOne).toHaveBeenCalledWith(tobaccoId);
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
      mockTobaccosRepository.getStatuses.mockResolvedValue(mockStatuses);

      // Act
      const result = await service.getStatuses();

      // Assert
      expect(result).toEqual(mockStatuses);
      expect(mockTobaccosRepository.getStatuses).toHaveBeenCalled();
    });

    it('should return empty array when no statuses exist', async () => {
      // Arrange
      mockTobaccosRepository.getStatuses.mockResolvedValue([]);

      // Act
      const result = await service.getStatuses();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findByUrl', () => {
    it('should return tobacco when found by URL', async () => {
      // Arrange
      const url =
        'https://htreviews.org/tobaccos/dogma/100-sigarnyy-pank/lemon-drops';
      mockTobaccosRepository.findBySlugs.mockResolvedValue(mockTobacco);

      // Act
      const result = await service.findByUrl(url);

      // Assert
      expect(result).toEqual(mockTobacco);
      expect(mockTobaccosRepository.findBySlugs).toHaveBeenCalledWith(
        'dogma',
        '100-sigarnyy-pank',
        'lemon-drops',
      );
    });

    it('should throw NotFoundException when tobacco not found', async () => {
      // Arrange
      const url =
        'https://htreviews.org/tobaccos/dogma/100-sigarnyy-pank/unknown-tobacco';
      mockTobaccosRepository.findBySlugs.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByUrl(url)).rejects.toThrow(NotFoundException);
      await expect(service.findByUrl(url)).rejects.toThrow(
        `Tobacco with URL '${url}' not found in database`,
      );
      expect(mockTobaccosRepository.findBySlugs).toHaveBeenCalledWith(
        'dogma',
        '100-sigarnyy-pank',
        'unknown-tobacco',
      );
    });

    it('should throw BadRequestException for invalid URL format', async () => {
      // Arrange
      const invalidUrl = 'https://example.com/invalid-url';

      // Act & Assert
      await expect(service.findByUrl(invalidUrl)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findByUrl(invalidUrl)).rejects.toThrow(
        'Invalid URL format',
      );
      expect(mockTobaccosRepository.findBySlugs).not.toHaveBeenCalled();
    });

    it('should extract correct slug from URL', async () => {
      // Arrange
      const url =
        'https://htreviews.org/tobaccos/test-brand/test-line/test-tobacco';
      mockTobaccosRepository.findBySlugs.mockResolvedValue(mockTobacco);

      // Act
      await service.findByUrl(url);

      // Assert
      expect(mockTobaccosRepository.findBySlugs).toHaveBeenCalledWith(
        'test-brand',
        'test-line',
        'test-tobacco',
      );
    });
  });
});
