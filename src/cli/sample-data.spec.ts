import { seedSampleData, LOCAL_DEV_API_KEY } from './sample-data';
import { ApiKey } from '../api-keys/api-keys.entity';
import { Brand } from '../brands/brands.entity';
import { Flavor } from '../flavors/flavors.entity';
import { Line } from '../lines/lines.entity';
import { Tobacco } from '../tobaccos/tobaccos.entity';

interface FakeRepository<T extends { id: string }> {
  rows: T[];
  findOne: jest.Mock;
  create: jest.Mock;
  merge: jest.Mock;
  save: jest.Mock;
}

let idCounter = 0;

function createFakeRepository<T extends { id: string }>(
  initialRows: T[] = [],
): FakeRepository<T> {
  const repository: FakeRepository<T> = {
    rows: [...initialRows],
    findOne: jest.fn(({ where }: { where: Partial<T> }) =>
      Promise.resolve(
        repository.rows.find((row) =>
          Object.entries(where).every(
            ([key, value]) => row[key as keyof T] === value,
          ),
        ) ?? null,
      ),
    ),
    create: jest.fn((data: Partial<T>) => ({
      id: `sample-${++idCounter}`,
      ...data,
    })),
    merge: jest.fn((target: T, data: Partial<T>) =>
      Object.assign(target, data),
    ),
    save: jest.fn((entity: T) => {
      const index = repository.rows.findIndex((row) => row.id === entity.id);
      if (index === -1) {
        repository.rows.push(entity);
      } else {
        repository.rows[index] = entity;
      }
      return Promise.resolve(entity);
    }),
  };

  return repository;
}

describe('seedSampleData', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it('creates a local API key and sample catalog when the database is empty', async () => {
    const apiKeys = createFakeRepository<ApiKey>();
    const brands = createFakeRepository<Brand>();
    const lines = createFakeRepository<Line>();
    const flavors = createFakeRepository<Flavor>();
    const tobaccos = createFakeRepository<Tobacco>();

    const result = await seedSampleData({
      apiKeyRepository: apiKeys,
      brandRepository: brands,
      lineRepository: lines,
      flavorRepository: flavors,
      tobaccoRepository: tobaccos,
    });

    expect(result).toEqual({
      apiKeys: { created: 1, updated: 0 },
      brands: { created: 2, updated: 0 },
      lines: { created: 2, updated: 0 },
      flavors: { created: 5, updated: 0 },
      tobaccos: { created: 3, updated: 0 },
    });
    expect(apiKeys.rows[0].key).toBe(LOCAL_DEV_API_KEY);
    expect(apiKeys.rows[0].createdAt).toBeInstanceOf(Date);
    expect(apiKeys.rows[0].updatedAt).toBeInstanceOf(Date);
    expect(brands.rows[0].createdAt).toBeInstanceOf(Date);
    expect(lines.rows[0].createdAt).toBeInstanceOf(Date);
    expect(tobaccos.rows[0].createdAt).toBeInstanceOf(Date);
    expect(tobaccos.rows[0].brand).toBeDefined();
    expect(tobaccos.rows[0].line).toBeDefined();
    expect(tobaccos.rows[0].flavors.length).toBeGreaterThan(0);
  });

  it('updates existing sample rows instead of duplicating them', async () => {
    const apiKeys = createFakeRepository<ApiKey>();
    const brands = createFakeRepository<Brand>();
    const lines = createFakeRepository<Line>();
    const flavors = createFakeRepository<Flavor>();
    const tobaccos = createFakeRepository<Tobacco>();
    const repositories = {
      apiKeyRepository: apiKeys,
      brandRepository: brands,
      lineRepository: lines,
      flavorRepository: flavors,
      tobaccoRepository: tobaccos,
    };

    await seedSampleData(repositories);
    const result = await seedSampleData(repositories);

    expect(result.brands).toEqual({ created: 0, updated: 2 });
    expect(result.lines).toEqual({ created: 0, updated: 2 });
    expect(result.flavors).toEqual({ created: 0, updated: 5 });
    expect(result.tobaccos).toEqual({ created: 0, updated: 3 });
    expect(result.apiKeys).toEqual({ created: 0, updated: 1 });
    expect(brands.rows).toHaveLength(2);
    expect(lines.rows).toHaveLength(2);
    expect(flavors.rows).toHaveLength(5);
    expect(tobaccos.rows).toHaveLength(3);
  });
});
