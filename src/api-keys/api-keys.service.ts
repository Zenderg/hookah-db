import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeysRepository } from './api-keys.repository';
import { ApiKey } from './api-keys.entity';
import { v4 as uuidv4 } from 'uuid';

export interface ApiKeyStats {
  totalKeys: number;
  activeKeys: number;
  inactiveKeys: number;
  totalRequests: number;
}

@Injectable()
export class ApiKeysService {
  constructor(private readonly apiKeysRepository: ApiKeysRepository) {}

  async findAll(): Promise<ApiKey[]> {
    return this.apiKeysRepository.findAll();
  }

  async createApiKey(name: string): Promise<ApiKey> {
    const apiKey = {
      name,
      key: uuidv4(),
      isActive: true,
      requestCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this.apiKeysRepository.create(apiKey);
  }

  async deleteApiKey(id: string): Promise<void> {
    const apiKey = await this.apiKeysRepository.findOneById(id);
    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }
    await this.apiKeysRepository.delete(id);
  }

  async getStats(): Promise<ApiKeyStats> {
    const allKeys = await this.apiKeysRepository.findAll();
    const activeKeys = allKeys.filter((key) => key.isActive).length;
    const inactiveKeys = allKeys.filter((key) => !key.isActive).length;
    const totalRequests = allKeys.reduce(
      (sum, key) => sum + key.requestCount,
      0,
    );

    return {
      totalKeys: allKeys.length,
      activeKeys,
      inactiveKeys,
      totalRequests,
    };
  }

  async validateApiKey(key: string): Promise<ApiKey | null> {
    const apiKey = await this.apiKeysRepository.findOneByKey(key);
    if (!apiKey || !apiKey.isActive) {
      return null;
    }
    await this.apiKeysRepository.incrementRequestCount(apiKey.id);
    await this.apiKeysRepository.updateLastUsed(apiKey.id);
    return apiKey;
  }
}
