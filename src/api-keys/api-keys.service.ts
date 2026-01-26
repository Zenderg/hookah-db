import { Injectable } from '@nestjs/common';
import { ApiKeysRepository } from './api-keys.repository';
import { ApiKey } from './api-keys.entity';

@Injectable()
export class ApiKeysService {
  constructor(private readonly apiKeysRepository: ApiKeysRepository) {}

  // TODO: Implement service methods
  async findAll(): Promise<ApiKey[]> {
    return this.apiKeysRepository.findAll();
  }

  async createApiKey(name: string): Promise<ApiKey> {
    // TODO: Generate secure API key
    const apiKey = {
      name,
      key: 'generated-key-placeholder',
      isActive: true,
      requestCount: 0,
    };
    return this.apiKeysRepository.create(apiKey);
  }

  async validateApiKey(key: string): Promise<boolean> {
    const apiKey = await this.apiKeysRepository.findOneByKey(key);
    return apiKey !== null && apiKey.isActive;
  }
}
