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

  async trackActiveKeyUsage(key: string): Promise<ApiKey | null> {
    const { schema, tableName, connection } = this.apiKeyRepository.metadata;
    const tablePath = schema
      ? `${connection.driver.escape(schema)}.${connection.driver.escape(tableName)}`
      : connection.driver.escape(tableName);
    const rows = await this.apiKeyRepository.query<ApiKey[]>(
      `WITH updated AS (
         UPDATE ${tablePath}
         SET "requestCount" = "requestCount" + 1,
             "lastUsedAt" = CURRENT_TIMESTAMP,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "key" = $1 AND "isActive" = TRUE
         RETURNING *
       )
       SELECT * FROM updated`,
      [key],
    );

    return rows[0] ? this.apiKeyRepository.create(rows[0]) : null;
  }

  async create(apiKey: Partial<ApiKey>): Promise<ApiKey> {
    const entity = this.apiKeyRepository.create(apiKey);
    return this.apiKeyRepository.save(entity);
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
