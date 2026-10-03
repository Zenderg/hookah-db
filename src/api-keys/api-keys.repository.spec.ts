import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
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
      query: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      metadata: {
        schema: 'isolated',
        tableName: 'api_keys',
        connection: {
          driver: {
            escape: jest.fn((identifier: string) => `"${identifier}"`),
          },
        },
      },
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

  describe('trackActiveKeyUsage', () => {
    it('atomically tracks an active key and returns the updated entity', async () => {
      const key = mockApiKey.key;
      const updatedApiKey = { ...mockApiKey, requestCount: 43 };
      mockApiKeyRepository.query.mockResolvedValue([updatedApiKey]);
      mockApiKeyRepository.create.mockReturnValue(updatedApiKey);

      const result = await repository.trackActiveKeyUsage(key);

      expect(result).toEqual(updatedApiKey);
      expect(mockApiKeyRepository.query).toHaveBeenCalledTimes(1);
      const [sql, parameters] = mockApiKeyRepository.query.mock.calls[0];
      expect(sql).toContain('UPDATE "isolated"."api_keys"');
      expect(sql).toContain('"requestCount" = "requestCount" + 1');
      expect(sql).toContain('"lastUsedAt" = CURRENT_TIMESTAMP');
      expect(sql).toContain('"updatedAt" = CURRENT_TIMESTAMP');
      expect(sql).toContain('WHERE "key" = $1 AND "isActive" = TRUE');
      expect(sql).toContain('RETURNING *');
      expect(sql).toContain('SELECT * FROM updated');
      expect(parameters).toEqual([key]);
      expect(mockApiKeyRepository.create).toHaveBeenCalledWith(updatedApiKey);
    });

    it('returns null when no active key matches', async () => {
      mockApiKeyRepository.query.mockResolvedValue([]);

      await expect(
        repository.trackActiveKeyUsage('missing-or-inactive'),
      ).resolves.toBeNull();
      expect(mockApiKeyRepository.query).toHaveBeenCalledTimes(1);
      expect(mockApiKeyRepository.create).not.toHaveBeenCalled();
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

  describe('delete', () => {
    it('should delete API key and return true when successful', async () => {
      // Arrange
      const apiKeyId = mockApiKey.id;
      const deleteResult: DeleteResult = {
        affected: 1,
        raw: [],
      };
      mockApiKeyRepository.delete.mockResolvedValue(deleteResult);

      // Act
      const result = await repository.delete(apiKeyId);

      // Assert
      expect(result).toBe(true);
      expect(mockApiKeyRepository.delete).toHaveBeenCalledWith(apiKeyId);
    });

    it('should return false when no API key was deleted', async () => {
      // Arrange
      const apiKeyId = 'non-existent-id';
      const deleteResult: DeleteResult = {
        affected: 0,
        raw: [],
      };
      mockApiKeyRepository.delete.mockResolvedValue(deleteResult);

      // Act
      const result = await repository.delete(apiKeyId);

      // Assert
      expect(result).toBe(false);
      expect(mockApiKeyRepository.delete).toHaveBeenCalledWith(apiKeyId);
    });

    it('should return false when affected is undefined', async () => {
      // Arrange
      const apiKeyId = mockApiKey.id;
      const deleteResult: DeleteResult = {
        raw: [],
      };
      mockApiKeyRepository.delete.mockResolvedValue(deleteResult);

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
