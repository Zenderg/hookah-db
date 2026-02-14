import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { BrandsRepository } from './brands.repository';
import { TobaccosRepository } from '../tobaccos/tobaccos.repository';
import { FindBrandsDto } from './dto/find-brands.dto';
import { FindTobaccosDto } from '../tobaccos/dto/find-tobaccos.dto';
import { Brand } from './brands.entity';
import { Tobacco } from '../tobaccos/tobaccos.entity';

/* eslint-disable @typescript-eslint/unbound-method */
describe('BrandsService', () => {
  let service: BrandsService;
  let mockBrandsRepository: jest.Mocked<BrandsRepository>;
  let mockTobaccosRepository: jest.Mocked<TobaccosRepository>;

  const mockBrand: Brand = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Brand',
    slug: 'test-brand',
    country: 'Россия',
    rating: 4.5,
    ratingsCount: 100,
    description: 'Test description',
    logoUrl: 'https://example.com/logo.png',
    status: 'Выпускается',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockTobacco: Tobacco = {
    id: 'tobacco-1',
    name: 'Test Tobacco',
    slug: 'test-tobacco',
    brandId: mockBrand.id,
    brand: mockBrand,
    lineId: null as any,
    line: null as any,
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
    mockBrandsRepository = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      getCountries: jest.fn(),
      getStatuses: jest.fn(),
      getNames: jest.fn(),
    } as unknown as jest.Mocked<BrandsRepository>;

    mockTobaccosRepository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<TobaccosRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        {
          provide: BrandsRepository,
          useValue: mockBrandsRepository,
        },
        {
          provide: TobaccosRepository,
          useValue: mockTobaccosRepository,
        },
      ],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated brands with default pagination', async () => {
      // Arrange
      const query: FindBrandsDto = { page: 1, limit: 20 };
      const mockBrands = [mockBrand];
      mockBrandsRepository.findAll.mockResolvedValue({
        data: mockBrands,
        total: 1,
      });

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toEqual({
        data: mockBrands,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      expect(mockBrandsRepository.findAll).toHaveBeenCalledWith(query);
    });

    it('should calculate totalPages correctly', async () => {
      // Arrange
      const query: FindBrandsDto = { page: 1, limit: 10 };
      const mockBrands = Array.from({ length: 25 }, (_, i) => ({
        ...mockBrand,
        id: `id-${i}`,
      }));
      mockBrandsRepository.findAll.mockResolvedValue({
        data: mockBrands,
        total: 25,
      });

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.meta.totalPages).toBe(3);
    });

    it('should handle empty results', async () => {
      // Arrange
      const query: FindBrandsDto = { page: 1, limit: 20 };
      mockBrandsRepository.findAll.mockResolvedValue({
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
      const query: FindBrandsDto = {
        page: 2,
        limit: 50,
        sortBy: 'name',
        order: 'asc',
        country: 'Россия',
        status: 'Выпускается',
        search: 'test',
      };
      mockBrandsRepository.findAll.mockResolvedValue({
        data: [],
        total: 0,
      });

      // Act
      await service.findAll(query);

      // Assert
      expect(mockBrandsRepository.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return brand when found', async () => {
      // Arrange
      const brandId = mockBrand.id;
      mockBrandsRepository.findOne.mockResolvedValue(mockBrand);

      // Act
      const result = await service.findOne(brandId);

      // Assert
      expect(result).toEqual(mockBrand);
      expect(mockBrandsRepository.findOne).toHaveBeenCalledWith(brandId);
    });

    it('should throw NotFoundException when brand not found', async () => {
      // Arrange
      const brandId = 'non-existent-id';
      mockBrandsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(brandId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(brandId)).rejects.toThrow('Brand not found');
      expect(mockBrandsRepository.findOne).toHaveBeenCalledWith(brandId);
    });
  });

  describe('findTobaccosByBrand', () => {
    it('should return paginated tobaccos for brand', async () => {
      // Arrange
      const brandId = mockBrand.id;
      const query: FindTobaccosDto = { page: 1, limit: 20 };
      const mockTobaccos = [mockTobacco];
      mockBrandsRepository.findOne.mockResolvedValue(mockBrand);
      mockTobaccosRepository.findAll.mockResolvedValue({
        data: mockTobaccos,
        total: 1,
      });

      // Act
      const result = await service.findTobaccosByBrand(brandId, query);

      // Assert
      expect(result).toEqual({
        data: mockTobaccos,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      expect(mockBrandsRepository.findOne).toHaveBeenCalledWith(brandId);
      expect(mockTobaccosRepository.findAll).toHaveBeenCalledWith({
        ...query,
        brandId,
      });
    });

    it('should throw NotFoundException when brand not found', async () => {
      // Arrange
      const brandId = 'non-existent-id';
      const query: FindTobaccosDto = { page: 1, limit: 20 };
      mockBrandsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findTobaccosByBrand(brandId, query)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findTobaccosByBrand(brandId, query)).rejects.toThrow(
        'Brand not found',
      );
      expect(mockBrandsRepository.findOne).toHaveBeenCalledWith(brandId);
      expect(mockTobaccosRepository.findAll).not.toHaveBeenCalled();
    });

    it('should calculate totalPages correctly for tobaccos', async () => {
      // Arrange
      const brandId = mockBrand.id;
      const query: FindTobaccosDto = { page: 1, limit: 10 };
      const mockTobaccos = Array.from({ length: 25 }, (_, i) => ({
        ...mockTobacco,
        id: `tobacco-${i}`,
        name: `Tobacco ${i}`,
        brandId,
      }));
      mockBrandsRepository.findOne.mockResolvedValue(mockBrand);
      mockTobaccosRepository.findAll.mockResolvedValue({
        data: mockTobaccos,
        total: 25,
      });

      // Act
      const result = await service.findTobaccosByBrand(brandId, query);

      // Assert
      expect(result.meta.totalPages).toBe(3);
    });

    it('should merge query with brandId when calling tobaccosRepository', async () => {
      // Arrange
      const brandId = mockBrand.id;
      const query: FindTobaccosDto = {
        page: 2,
        limit: 15,
        sortBy: 'rating',
        order: 'desc',
        status: 'Выпускается',
      };
      mockBrandsRepository.findOne.mockResolvedValue(mockBrand);
      mockTobaccosRepository.findAll.mockResolvedValue({
        data: [],
        total: 0,
      });

      // Act
      await service.findTobaccosByBrand(brandId, query);

      // Assert
      expect(mockTobaccosRepository.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 15,
        sortBy: 'rating',
        order: 'desc',
        status: 'Выпускается',
        brandId,
      });
    });
  });

  describe('getCountries', () => {
    it('should return list of unique countries', async () => {
      // Arrange
      const mockCountries = ['Россия', 'США', 'Германия'];
      mockBrandsRepository.getCountries.mockResolvedValue(mockCountries);

      // Act
      const result = await service.getCountries();

      // Assert
      expect(result).toEqual(mockCountries);
      expect(mockBrandsRepository.getCountries).toHaveBeenCalled();
    });

    it('should return empty array when no countries exist', async () => {
      // Arrange
      mockBrandsRepository.getCountries.mockResolvedValue([]);

      // Act
      const result = await service.getCountries();

      // Assert
      expect(result).toEqual([]);
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
      mockBrandsRepository.getStatuses.mockResolvedValue(mockStatuses);

      // Act
      const result = await service.getStatuses();

      // Assert
      expect(result).toEqual(mockStatuses);
      expect(mockBrandsRepository.getStatuses).toHaveBeenCalled();
    });

    it('should return empty array when no statuses exist', async () => {
      // Arrange
      mockBrandsRepository.getStatuses.mockResolvedValue([]);

      // Act
      const result = await service.getStatuses();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getNames', () => {
    it('should return list of all brand names', async () => {
      // Arrange
      const mockNames = [
        'Adalya',
        'Dark Side',
        'Musthave',
        'Tangiers',
      ];
      mockBrandsRepository.getNames.mockResolvedValue(mockNames);

      // Act
      const result = await service.getNames();

      // Assert
      expect(result).toEqual(mockNames);
      expect(mockBrandsRepository.getNames).toHaveBeenCalled();
    });

    it('should return empty array when no brands exist', async () => {
      // Arrange
      mockBrandsRepository.getNames.mockResolvedValue([]);

      // Act
      const result = await service.getNames();

      // Assert
      expect(result).toEqual([]);
    });
  });
});
