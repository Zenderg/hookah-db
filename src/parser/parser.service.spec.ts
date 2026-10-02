import { ParserService } from './parser.service';
import type { ParsedTobaccoData } from './strategies/tobacco-parser.strategy';

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
    parseTobaccos: jest.fn().mockResolvedValue(parsedTobaccos),
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
