import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysRepository } from './api-keys.repository';
import { ApiKey } from './api-keys.entity';

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

/* eslint-disable @typescript-eslint/unbound-method */
describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let mockApiKeysRepository: jest.Mocked<ApiKeysRepository>;

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
    mockApiKeysRepository = {
      findAll: jest.fn(),
      findOneById: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      trackActiveKeyUsage: jest.fn(),
      getCount: jest.fn(),
    } as unknown as jest.Mocked<ApiKeysRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        {
          provide: ApiKeysRepository,
          useValue: mockApiKeysRepository,
        },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all API keys', async () => {
      // Arrange
      const mockApiKeys = [mockApiKey];
      mockApiKeysRepository.findAll.mockResolvedValue(mockApiKeys);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(mockApiKeys);
      expect(mockApiKeysRepository.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no API keys exist', async () => {
      // Arrange
      mockApiKeysRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('createApiKey', () => {
    it('should create a new API key with generated UUID', async () => {
      // Arrange
      const name = 'New API Key';
      const createdApiKey = {
        ...mockApiKey,
        id: 'new-id',
        key: 'generated-uuid',
        name,
      };
      mockApiKeysRepository.create.mockResolvedValue(createdApiKey);

      // Act
      const result = await service.createApiKey(name);

      // Assert
      expect(result).toEqual(createdApiKey);
      expect(mockApiKeysRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name,
          key: 'mock-uuid-v4',
          isActive: true,
          requestCount: 0,
        }),
      );
    });

    it('should set isActive to true by default', async () => {
      // Arrange
      const name = 'Test Key';
      const createdApiKey = { ...mockApiKey, name };
      mockApiKeysRepository.create.mockResolvedValue(createdApiKey);

      // Act
      await service.createApiKey(name);

      // Assert
      expect(mockApiKeysRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it('should initialize requestCount to 0', async () => {
      // Arrange
      const name = 'Test Key';
      const createdApiKey = { ...mockApiKey, name };
      mockApiKeysRepository.create.mockResolvedValue(createdApiKey);

      // Act
      await service.createApiKey(name);

      // Assert
      expect(mockApiKeysRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ requestCount: 0 }),
      );
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      // Arrange
      const name = 'Test Key';
      const createdApiKey = { ...mockApiKey, name };
      mockApiKeysRepository.create.mockResolvedValue(createdApiKey);

      // Act
      await service.createApiKey(name);

      // Assert
      const createCall = mockApiKeysRepository.create.mock.calls[0][0];
      expect(createCall.createdAt).toBeInstanceOf(Date);
      expect(createCall.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('deleteApiKey', () => {
    it('should delete API key when found', async () => {
      // Arrange
      const apiKeyId = mockApiKey.id;
      mockApiKeysRepository.findOneById.mockResolvedValue(mockApiKey);
      mockApiKeysRepository.delete.mockResolvedValue(true);

      // Act
      await service.deleteApiKey(apiKeyId);

      // Assert
      expect(mockApiKeysRepository.findOneById).toHaveBeenCalledWith(apiKeyId);
      expect(mockApiKeysRepository.delete).toHaveBeenCalledWith(apiKeyId);
    });

    it('should throw NotFoundException when API key not found', async () => {
      // Arrange
      const apiKeyId = 'non-existent-id';
      mockApiKeysRepository.findOneById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteApiKey(apiKeyId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteApiKey(apiKeyId)).rejects.toThrow(
        `API key with ID ${apiKeyId} not found`,
      );
      expect(mockApiKeysRepository.findOneById).toHaveBeenCalledWith(apiKeyId);
      expect(mockApiKeysRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics for active and inactive keys', async () => {
      // Arrange
      const mockApiKeys = [
        { ...mockApiKey, isActive: true, requestCount: 10 },
        { ...mockApiKey, id: '2', isActive: true, requestCount: 20 },
        { ...mockApiKey, id: '3', isActive: false, requestCount: 5 },
      ];
      mockApiKeysRepository.findAll.mockResolvedValue(mockApiKeys);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        totalKeys: 3,
        activeKeys: 2,
        inactiveKeys: 1,
        totalRequests: 35,
      });
    });

    it('should return zero statistics when no API keys exist', async () => {
      // Arrange
      mockApiKeysRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        totalKeys: 0,
        activeKeys: 0,
        inactiveKeys: 0,
        totalRequests: 0,
      });
    });

    it('should calculate totalRequests correctly across all keys', async () => {
      // Arrange
      const mockApiKeys = [
        { ...mockApiKey, requestCount: 100 },
        { ...mockApiKey, id: '2', requestCount: 200 },
        { ...mockApiKey, id: '3', requestCount: 300 },
      ];
      mockApiKeysRepository.findAll.mockResolvedValue(mockApiKeys);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.totalRequests).toBe(600);
    });

    it('should count all keys as active when none are inactive', async () => {
      // Arrange
      const mockApiKeys = [
        { ...mockApiKey, isActive: true },
        { ...mockApiKey, id: '2', isActive: true },
      ];
      mockApiKeysRepository.findAll.mockResolvedValue(mockApiKeys);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.activeKeys).toBe(2);
      expect(result.inactiveKeys).toBe(0);
    });

    it('should count all keys as inactive when none are active', async () => {
      // Arrange
      const mockApiKeys = [
        { ...mockApiKey, isActive: false },
        { ...mockApiKey, id: '2', isActive: false },
      ];
      mockApiKeysRepository.findAll.mockResolvedValue(mockApiKeys);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.activeKeys).toBe(0);
      expect(result.inactiveKeys).toBe(2);
    });
  });

  describe('validateApiKey', () => {
    it('should return API key and update tracking when valid', async () => {
      const key = 'valid-api-key';
      const updatedApiKey = { ...mockApiKey, requestCount: 43 };
      mockApiKeysRepository.trackActiveKeyUsage.mockResolvedValue(
        updatedApiKey,
      );

      const result = await service.validateApiKey(key);

      expect(result).toEqual(updatedApiKey);
      expect(mockApiKeysRepository.trackActiveKeyUsage).toHaveBeenCalledTimes(
        1,
      );
      expect(mockApiKeysRepository.trackActiveKeyUsage).toHaveBeenCalledWith(
        key,
      );
    });

    it.each(['non-existent-key', 'inactive-key'])(
      'should return null when key %s is not active',
      async (key) => {
        mockApiKeysRepository.trackActiveKeyUsage.mockResolvedValue(null);

        const result = await service.validateApiKey(key);

        expect(result).toBeNull();
        expect(mockApiKeysRepository.trackActiveKeyUsage).toHaveBeenCalledTimes(
          1,
        );
        expect(mockApiKeysRepository.trackActiveKeyUsage).toHaveBeenCalledWith(
          key,
        );
      },
    );
  });
});
