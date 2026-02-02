import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeysRepository } from './api-keys.repository';
import { ApiKey } from './api-keys.entity';

/* eslint-disable @typescript-eslint/unbound-method */
describe('ApiKeysRepository', () => {
  let repository: ApiKeysRepository;
  let mockApiKeyRepository: jest.Mocked<Repository<ApiKey>>;

  const mockApiKey: ApiKey = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    key: 'test-api-key-123',
    name: 'Test API Key',
    isActive: true,
    requestCount: 42,
    lastUsedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    // Create mock repository
    mockApiKeyRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      increment: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<Repository<ApiKey>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysRepository,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: mockApiKeyRepository,
        },
      ],
    }).compile();

    repository = module.get<ApiKeysRepository>(ApiKeysRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all API keys', async () => {
      // Arrange
      const mockApiKeys = [mockApiKey];
      mockApiKeyRepository.find.mockResolvedValue(mockApiKeys);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual(mockApiKeys);
      expect(mockApiKeyRepository.find).toHaveBeenCalled();
    });

    it('should return empty array when no API keys exist', async () => {
      // Arrange
      mockApiKeyRepository.find.mockResolvedValue([]);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findOneByKey', () => {
    it('should return API key when found by key', async () => {
      // Arrange
      const key = mockApiKey.key;
      mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey);

      // Act
      const result = await repository.findOneByKey(key);

      // Assert
      expect(result).toEqual(mockApiKey);
      expect(mockApiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { key },
      });
    });

    it('should return null when API key not found by key', async () => {
      // Arrange
      const key = 'non-existent-key';
      mockApiKeyRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await repository.findOneByKey(key);

      // Assert
      expect(result).toBeNull();
      expect(mockApiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { key },
      });
    });
  });

  describe('create', () => {
    it('should create and return new API key', async () => {
      // Arrange
      const apiKeyData: Partial<ApiKey> = {
        name: 'New API Key',
        key: 'generated-uuid',
        isActive: true,
        requestCount: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const createdApiKey = { ...mockApiKey, ...apiKeyData };
      mockApiKeyRepository.create.mockReturnValue(createdApiKey);
      mockApiKeyRepository.save.mockResolvedValue(createdApiKey);

      // Act
      const result = await repository.create(apiKeyData);

      // Assert
      expect(result).toEqual(createdApiKey);
      expect(mockApiKeyRepository.create).toHaveBeenCalledWith(apiKeyData);
      expect(mockApiKeyRepository.save).toHaveBeenCalledWith(createdApiKey);
    });
  });

  describe('updateLastUsed', () => {
    it('should update lastUsedAt timestamp for API key', async () => {
      // Arrange
      const apiKeyId = mockApiKey.id;
      const newLastUsedAt = new Date('2024-01-02');
      mockApiKeyRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await repository.updateLastUsed(apiKeyId);

      // Assert
      expect(mockApiKeyRepository.update).toHaveBeenCalledWith(apiKeyId, {
        lastUsedAt: expect.any(Date),
      });
    });
  });

  describe('incrementRequestCount', () => {
    it('should increment requestCount by 1 for API key', async () => {
      // Arrange
      const apiKeyId = mockApiKey.id;
      mockApiKeyRepository.increment.mockResolvedValue({ affected: 1 } as any);

      // Act
      await repository.incrementRequestCount(apiKeyId);

      // Assert
      expect(mockApiKeyRepository.increment).toHaveBeenCalledWith(
        { id: apiKeyId },
        'requestCount',
        1,
      );
    });
  });

  describe('delete', () => {
    it('should delete API key and return true when successful', async () => {
      // Arrange
      const apiKeyId = mockApiKey.id;
      mockApiKeyRepository.delete.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await repository.delete(apiKeyId);

      // Assert
      expect(result).toBe(true);
      expect(mockApiKeyRepository.delete).toHaveBeenCalledWith(apiKeyId);
    });

    it('should return false when no API key was deleted', async () => {
      // Arrange
      const apiKeyId = 'non-existent-id';
      mockApiKeyRepository.delete.mockResolvedValue({ affected: 0 } as any);

      // Act
      const result = await repository.delete(apiKeyId);

      // Assert
      expect(result).toBe(false);
      expect(mockApiKeyRepository.delete).toHaveBeenCalledWith(apiKeyId);
    });

    it('should return false when affected is undefined', async () => {
      // Arrange
      const apiKeyId = mockApiKey.id;
      mockApiKeyRepository.delete.mockResolvedValue({} as any);

      // Act
      const result = await repository.delete(apiKeyId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('findOneById', () => {
    it('should return API key when found by ID', async () => {
      // Arrange
      const apiKeyId = mockApiKey.id;
      mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey);

      // Act
      const result = await repository.findOneById(apiKeyId);

      // Assert
      expect(result).toEqual(mockApiKey);
      expect(mockApiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { id: apiKeyId },
      });
    });

    it('should return null when API key not found by ID', async () => {
      // Arrange
      const apiKeyId = 'non-existent-id';
      mockApiKeyRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await repository.findOneById(apiKeyId);

      // Assert
      expect(result).toBeNull();
      expect(mockApiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { id: apiKeyId },
      });
    });
  });

  describe('getCount', () => {
    it('should return total count of API keys', async () => {
      // Arrange
      const count = 5;
      mockApiKeyRepository.count.mockResolvedValue(count);

      // Act
      const result = await repository.getCount();

      // Assert
      expect(result).toBe(count);
      expect(mockApiKeyRepository.count).toHaveBeenCalled();
    });

    it('should return 0 when no API keys exist', async () => {
      // Arrange
      mockApiKeyRepository.count.mockResolvedValue(0);

      // Act
      const result = await repository.getCount();

      // Assert
      expect(result).toBe(0);
    });
  });
});
