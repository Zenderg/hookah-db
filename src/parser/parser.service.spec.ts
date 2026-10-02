import type { ConfigService } from '@nestjs/config';
import { ParserService } from './parser.service';
import type { ParsedTobaccoData } from './strategies/tobacco-parser.strategy';

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

type ParserServiceTestAccess = {
  saveTobaccoWithFlavors: (
    tobacco: ParsedTobaccoData,
  ) => Promise<{ action: 'created' | 'updated' }>;
  logger: { log: (...args: unknown[]) => void };
};

const getTestAccess = (service: ParserService): ParserServiceTestAccess =>
  service as unknown as ParserServiceTestAccess;

const validTobacco: ParsedTobaccoData = {
  name: 'Mint Sample',
  slug: 'mint-sample',
  brandId: 'brand-1',
  lineId: 'line-1',
  rating: 4.5,
  ratingsCount: 10,
  strengthOfficial: 'Средняя',
  strengthByRatings: 'Средняя',
  status: 'Выпускается',
  htreviewsId: 'htr12345',
  imageUrl: '',
  description: '',
  flavors: ['Mint'],
};

function createService(parsedTobaccos: ParsedTobaccoData[] = []) {
  const tobaccoRepository = {
    findOne: jest.fn(),
    create: jest.fn((data: Record<string, unknown>) => ({ ...data })),
    save: jest.fn((tobacco: unknown) => Promise.resolve(tobacco)),
    update: jest.fn(),
  };
  const flavorRepository = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((data: Record<string, unknown>) => ({ ...data })),
    save: jest.fn((flavor: Record<string, unknown>) =>
      Promise.resolve({ ...flavor, id: 'flavor-1' }),
    ),
  };
  const tobaccoParserStrategy = {
    initialize: jest.fn(),
    parseTobaccos: jest
      .fn()
      .mockResolvedValue({ items: parsedTobaccos, errors: 0 }),
    parseTobaccoByUrl: jest.fn(),
    normalizeToEntity: jest.fn((data: ParsedTobaccoData) => ({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    close: jest.fn(),
  };
  const lineRepository = { find: jest.fn().mockResolvedValue([]) };
  const brandRepository = { find: jest.fn().mockResolvedValue([]) };
  const service = new ParserService(
    brandRepository as never,
    lineRepository as never,
    tobaccoRepository as never,
    flavorRepository as never,
    {} as never,
    {} as never,
    tobaccoParserStrategy as never,
    {} as never,
  );

  return {
    service,
    tobaccoRepository,
    flavorRepository,
    tobaccoParserStrategy,
    lineRepository,
    brandRepository,
  };
}

describe('ParserService tobacco identity validation', () => {
  it.each(['', '   ', 'htr', 'htreviews123', 'htr123x', 'htr123\n', 'htr123 '])(
    'rejects invalid htreviewsId %j before normalizing or accessing repositories',
    async (htreviewsId) => {
      const {
        service,
        tobaccoRepository,
        flavorRepository,
        tobaccoParserStrategy,
      } = createService();
      const invalidTobacco = { ...validTobacco, htreviewsId };

      await expect(
        getTestAccess(service).saveTobaccoWithFlavors(invalidTobacco),
      ).rejects.toThrow('Invalid htreviewsId');

      expect(tobaccoParserStrategy.normalizeToEntity).not.toHaveBeenCalled();
      expect(flavorRepository.findOne).not.toHaveBeenCalled();
      expect(flavorRepository.create).not.toHaveBeenCalled();
      expect(flavorRepository.save).not.toHaveBeenCalled();
      expect(tobaccoRepository.findOne).not.toHaveBeenCalled();
      expect(tobaccoRepository.create).not.toHaveBeenCalled();
      expect(tobaccoRepository.save).not.toHaveBeenCalled();
      expect(tobaccoRepository.update).not.toHaveBeenCalled();
    },
  );

  it('creates a tobacco and resolves its flavors for a valid identity', async () => {
    const { service, tobaccoRepository, flavorRepository } = createService();
    tobaccoRepository.findOne.mockResolvedValue(null);

    await expect(
      getTestAccess(service).saveTobaccoWithFlavors(validTobacco),
    ).resolves.toEqual({ action: 'created' });

    expect(tobaccoRepository.findOne).toHaveBeenCalledWith({
      where: { htreviewsId: 'htr12345' },
    });
    expect(flavorRepository.findOne).toHaveBeenCalledWith({
      where: { name: 'Mint' },
    });
    expect(tobaccoRepository.save).toHaveBeenCalledTimes(1);
  });

  it('updates an existing tobacco for a valid identity', async () => {
    const { service, tobaccoRepository } = createService();
    const existing = { id: 'tobacco-1', flavors: [] };
    tobaccoRepository.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);

    await expect(
      getTestAccess(service).saveTobaccoWithFlavors(validTobacco),
    ).resolves.toEqual({ action: 'updated' });

    expect(tobaccoRepository.update).toHaveBeenCalledWith(
      'tobacco-1',
      expect.objectContaining({ htreviewsId: 'htr12345' }),
    );
    expect(tobaccoRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tobacco-1',
        flavors: [expect.objectContaining({ name: 'Mint' })],
      }),
    );
  });

  it('counts an invalid batch entry as an error and continues to the next tobacco', async () => {
    const invalidTobacco = { ...validTobacco, htreviewsId: '' };
    const {
      service,
      tobaccoRepository,
      tobaccoParserStrategy,
      lineRepository,
      brandRepository,
    } = createService([invalidTobacco, validTobacco]);
    lineRepository.find.mockResolvedValue([
      { id: 'line-1', slug: 'line', brandId: 'brand-1' },
    ]);
    brandRepository.find.mockResolvedValue([{ id: 'brand-1', slug: 'brand' }]);
    tobaccoRepository.findOne.mockResolvedValue(null);
    const log = jest.spyOn(getTestAccess(service).logger, 'log');

    await service.parseTobaccosManually();

    expect(log).toHaveBeenCalledWith(
      'Tobacco parsing completed: 1 created, 0 updated, 1 errors',
    );
    expect(tobaccoRepository.save).toHaveBeenCalledTimes(1);
    expect(tobaccoRepository.findOne).toHaveBeenCalledTimes(1);
    expect(tobaccoParserStrategy.close).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid single-URL parse and closes the parser', async () => {
    const invalidTobacco = { ...validTobacco, htreviewsId: '   ' };
    const {
      service,
      tobaccoRepository,
      flavorRepository,
      tobaccoParserStrategy,
    } = createService();
    tobaccoParserStrategy.parseTobaccoByUrl.mockResolvedValue(invalidTobacco);

    await expect(
      service.parseTobaccoByUrl(
        '/tobaccos/brand/line/mint',
        'brand-1',
        'line-1',
      ),
    ).rejects.toThrow('Invalid htreviewsId');

    expect(tobaccoRepository.findOne).not.toHaveBeenCalled();
    expect(flavorRepository.findOne).not.toHaveBeenCalled();
    expect(tobaccoParserStrategy.close).toHaveBeenCalledTimes(1);
  });
});
