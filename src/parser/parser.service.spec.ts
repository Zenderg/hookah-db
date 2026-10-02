import type { ConfigService } from '@nestjs/config';
import { ParserService } from './parser.service';

describe('ParserService batch failures', () => {
  const makeService = (options?: {
    brands?: { items: unknown[]; errors: number };
    lines?: { items: unknown[]; errors: number };
    tobaccos?: { items: unknown[]; errors: number };
    saveBrand?: jest.Mock;
    saveLine?: jest.Mock;
    brandRows?: unknown[];
    lineRows?: unknown[];
  }) => {
    const brandParserStrategy = {
      initialize: jest.fn(),
      close: jest.fn(),
      parseBrands: jest
        .fn()
        .mockResolvedValue(options?.brands ?? { items: [], errors: 0 }),
      normalizeToEntity: jest.fn((brand: unknown): unknown => brand),
    };
    const lineParserStrategy = {
      initialize: jest.fn(),
      close: jest.fn(),
      parseLines: jest
        .fn()
        .mockResolvedValue(options?.lines ?? { items: [], errors: 0 }),
      normalizeToEntity: jest.fn((line: unknown): unknown => line),
    };
    const tobaccoParserStrategy = {
      initialize: jest.fn(),
      close: jest.fn(),
      parseTobaccos: jest
        .fn()
        .mockResolvedValue(options?.tobaccos ?? { items: [], errors: 0 }),
      normalizeToEntity: jest.fn((tobacco: unknown): unknown => tobacco),
    };
    const brandRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue(options?.brandRows ?? []),
      create: jest.fn((brand: unknown): unknown => brand),
      save: options?.saveBrand ?? jest.fn().mockResolvedValue(undefined),
      update: jest.fn(),
    };
    const lineRepository = {
      find: jest.fn().mockResolvedValue(options?.lineRows ?? []),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((line: unknown): unknown => line),
      save: options?.saveLine ?? jest.fn().mockResolvedValue(undefined),
      update: jest.fn(),
    };
    const emptyRepository = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((item: unknown): unknown => item),
      save: jest.fn(),
      update: jest.fn(),
    };
    const service = new ParserService(
      brandRepository as never,
      lineRepository as never,
      emptyRepository as never,
      emptyRepository as never,
      brandParserStrategy as never,
      lineParserStrategy as never,
      tobaccoParserStrategy as never,
      { get: jest.fn(() => 'true') } as unknown as ConfigService,
    );

    return {
      service,
      brandRepository,
      brandParserStrategy,
      lineParserStrategy,
      tobaccoParserStrategy,
    };
  };

  it('rejects a fully failed brand load with its counts and closes the browser', async () => {
    const { service, brandParserStrategy, lineParserStrategy } = makeService({
      brands: { items: [], errors: 2 },
    });

    await expect(service.handleDailyRefresh()).rejects.toMatchObject({
      name: 'ParserRefreshError',
      results: {
        brands: { created: 0, updated: 0, errors: 2 },
        lines: { created: 0, updated: 0, errors: 0 },
        tobaccos: { created: 0, updated: 0, errors: 0 },
      },
    });
    expect(brandParserStrategy.close).toHaveBeenCalledTimes(1);
    expect(lineParserStrategy.initialize).not.toHaveBeenCalled();
  });

  it('resolves an empty, error-free catalog load', async () => {
    const { service } = makeService();

    await expect(service.handleDailyRefresh()).resolves.toEqual({
      brands: { created: 0, updated: 0, errors: 0 },
      lines: { created: 0, updated: 0, errors: 0 },
      tobaccos: { created: 0, updated: 0, errors: 0 },
    });
  });

  it('continues saving successful items and retains both parse and save errors', async () => {
    const saveBrand = jest
      .fn()
      .mockRejectedValueOnce(new Error('fixture save failure'))
      .mockResolvedValue(undefined);
    const { service, brandRepository, lineParserStrategy } = makeService({
      brands: {
        items: [
          { name: 'Fixture failed', slug: 'fixture-failed' },
          { name: 'Fixture saved', slug: 'fixture-saved' },
        ],
        errors: 1,
      },
      saveBrand,
    });

    await expect(service.handleDailyRefresh()).rejects.toMatchObject({
      name: 'ParserRefreshError',
      results: {
        brands: { created: 1, updated: 0, errors: 2 },
      },
    });
    expect(brandRepository.save).toHaveBeenCalledTimes(2);
    expect(lineParserStrategy.initialize).toHaveBeenCalledTimes(1);
  });
  it('includes later-stage strategy failures after continuing eligible stages', async () => {
    const brand = { id: 'brand-1', name: 'Fixture', slug: 'fixture' };
    const line = {
      id: 'line-1',
      name: 'Fixture line',
      slug: 'fixture-line',
      brandId: 'brand-1',
    };
    const { service, lineParserStrategy, tobaccoParserStrategy } = makeService({
      brands: { items: [brand], errors: 0 },
      lines: { items: [line], errors: 2 },
      tobaccos: { items: [], errors: 3 },
      brandRows: [brand],
      lineRows: [line],
    });

    await expect(service.handleDailyRefresh()).rejects.toMatchObject({
      name: 'ParserRefreshError',
      results: {
        brands: { created: 1, errors: 0 },
        lines: { created: 1, updated: 0, errors: 2 },
        tobaccos: { created: 0, updated: 0, errors: 3 },
      },
    });
    expect(lineParserStrategy.initialize).toHaveBeenCalledTimes(1);
    expect(tobaccoParserStrategy.initialize).toHaveBeenCalledTimes(1);
    expect(tobaccoParserStrategy.close).toHaveBeenCalledTimes(1);
  });

  it('returns parse errors from each manual batch and closes each strategy', async () => {
    const {
      service,
      brandParserStrategy,
      lineParserStrategy,
      tobaccoParserStrategy,
    } = makeService({
      brands: { items: [], errors: 2 },
      lines: { items: [], errors: 3 },
      tobaccos: { items: [], errors: 4 },
    });

    await expect(service.parseBrandsManually()).resolves.toEqual({
      created: 0,
      updated: 0,
      errors: 2,
    });
    await expect(service.parseLinesManually()).resolves.toEqual({
      created: 0,
      updated: 0,
      errors: 3,
    });
    await expect(service.parseTobaccosManually()).resolves.toEqual({
      created: 0,
      updated: 0,
      errors: 4,
    });
    expect(brandParserStrategy.close).toHaveBeenCalledTimes(1);
    expect(lineParserStrategy.close).toHaveBeenCalledTimes(1);
    expect(tobaccoParserStrategy.close).toHaveBeenCalledTimes(1);
  });
});
