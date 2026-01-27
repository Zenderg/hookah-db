import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from './api-keys.entity';

@Injectable()
export class ApiKeysRepository {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  // TODO: Implement repository methods
  async findAll(): Promise<ApiKey[]> {
    return this.apiKeyRepository.find();
  }

  async findOneByKey(key: string): Promise<ApiKey | null> {
    return this.apiKeyRepository.findOne({ where: { key } });
  }

  async create(apiKey: Partial<ApiKey>): Promise<ApiKey> {
    return this.apiKeyRepository.save(apiKey);
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.apiKeyRepository.update(id, { lastUsedAt: new Date() });
  }

  async incrementRequestCount(id: string): Promise<void> {
    await this.apiKeyRepository.increment({ id }, 'requestCount', 1);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.apiKeyRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async findOneById(id: string): Promise<ApiKey | null> {
    return this.apiKeyRepository.findOne({ where: { id } });
  }

  async getCount(): Promise<number> {
    return this.apiKeyRepository.count();
  }
}
