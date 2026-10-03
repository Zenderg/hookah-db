import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { ApiKey } from './api-keys.entity';
import { ApiKeysRepository } from './api-keys.repository';

const describePostgres =
  process.env.POSTGRES_SEARCH_TESTS === 'true' ? describe : describe.skip;

describePostgres('ApiKeysRepository PostgreSQL usage tracking', () => {
  const schema = `api_key_test_${randomUUID().replaceAll('-', '')}`;
  const quotedSchema = `"${schema}"`;
  const connectionOptions = {
    type: 'postgres' as const,
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5432),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'hookah_db',
  };
  let adminDataSource: DataSource;
  let dataSource: DataSource;
  let repository: ApiKeysRepository;

  beforeAll(async () => {
    adminDataSource = new DataSource({
      ...connectionOptions,
      synchronize: false,
    });
    await adminDataSource.initialize();
    await adminDataSource.query(`CREATE SCHEMA ${quotedSchema}`);

    dataSource = new DataSource({
      ...connectionOptions,
      schema,
      extra: { options: `-c search_path=${schema}` },
      entities: [ApiKey],
      synchronize: false,
    });
    await dataSource.initialize();
    await dataSource.query(`
      CREATE TABLE ${quotedSchema}.api_keys (
        id uuid PRIMARY KEY,
        key varchar NOT NULL UNIQUE,
        name varchar NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "requestCount" integer NOT NULL DEFAULT 0,
        "lastUsedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    repository = new ApiKeysRepository(dataSource.getRepository(ApiKey));
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }

    if (adminDataSource?.isInitialized) {
      try {
        await adminDataSource.query(
          `DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`,
        );
      } finally {
        await adminDataSource.destroy();
      }
    }
  });

  it('keeps every concurrent accepted request in the atomic counter', async () => {
    const key = `concurrent-${randomUUID()}`;
    await dataSource
      .getRepository(ApiKey)
      .save({ id: randomUUID(), key, name: 'Concurrent', isActive: true });

    const results = await Promise.all(
      Array.from({ length: 40 }, () => repository.trackActiveKeyUsage(key)),
    );

    expect(results.every((result) => result !== null)).toBe(true);
    expect(
      results
        .filter((result): result is ApiKey => result !== null)
        .map((result) => result.requestCount)
        .sort((a, b) => a - b),
    ).toEqual(Array.from({ length: 40 }, (_, index) => index + 1));
    const persisted = await dataSource
      .getRepository(ApiKey)
      .findOneByOrFail({ key });
    expect(persisted.requestCount).toBe(40);
    expect(persisted.lastUsedAt).toBeInstanceOf(Date);
    expect(persisted.updatedAt).toBeInstanceOf(Date);
  });

  it('does not change counts for missing or inactive keys and enforces revocation immediately', async () => {
    const apiKeyRepository = dataSource.getRepository(ApiKey);
    const apiKey = await apiKeyRepository.save({
      id: randomUUID(),
      key: `revocation-${randomUUID()}`,
      name: 'Revocation',
      isActive: true,
    });

    await expect(
      repository.trackActiveKeyUsage(`missing-${randomUUID()}`),
    ).resolves.toBeNull();
    const accepted = await repository.trackActiveKeyUsage(apiKey.key);
    expect(accepted?.requestCount).toBe(1);
    const beforeRevocation = await apiKeyRepository.findOneByOrFail({
      id: apiKey.id,
    });

    await apiKeyRepository.update(apiKey.id, { isActive: false });

    await expect(
      repository.trackActiveKeyUsage(apiKey.key),
    ).resolves.toBeNull();
    const afterRevocation = await apiKeyRepository.findOneByOrFail({
      id: apiKey.id,
    });
    expect(afterRevocation.requestCount).toBe(1);
    expect(afterRevocation.lastUsedAt).toEqual(beforeRevocation.lastUsedAt);
    expect(afterRevocation.isActive).toBe(false);
  });
});
