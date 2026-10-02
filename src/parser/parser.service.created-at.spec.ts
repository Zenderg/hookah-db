import { Repository } from 'typeorm';
import { Brand } from '../brands/brands.entity';
import { Line } from '../lines/lines.entity';
import { Tobacco } from '../tobaccos/tobaccos.entity';
import { Flavor } from '../flavors/flavors.entity';
import { ParserService } from './parser.service';
import { BrandParserStrategy } from './strategies/brand-parser.strategy';
import { LineParserStrategy } from './strategies/line-parser.strategy';
import { TobaccoParserStrategy } from './strategies/tobacco-parser.strategy';

const oldDate = new Date('2019-02-03T04:05:06.000Z');
const brandData = {
  name: 'Synthetic Brand',
  slug: 'synthetic-brand',
  country: 'RU',
  rating: 4,
  ratingsCount: 5,
  description: 'Updated description',
  logoUrl: 'https://example.invalid/logo.png',
  detailUrl: 'https://example.invalid/brand',
  status: 'Active',
};
const lineData = {
  name: 'Synthetic Line',
  slug: 'synthetic-line',
  brandId: 'brand-1',
  description: 'Updated description',
  imageUrl: null,
  strengthOfficial: null,
  strengthByRatings: null,
  status: null,
  rating: 4,
  ratingsCount: 5,
};
const tobaccoData = {
  name: 'Synthetic Tobacco',
  slug: 'synthetic-tobacco',
  brandId: 'brand-1',
  lineId: 'line-1',
  rating: 4,
  ratingsCount: 5,
  strengthOfficial: null,
  strengthByRatings: null,
  status: null,
  htreviewsId: 'htr12345',
  imageUrl: null,
  description: null,
  flavors: ['Synthetic Mint'],
};

type Update = { createdAt?: Date; [key: string]: unknown };
type RepoStub = {
  repo: Repository<never>;
  updates: Update[];
  saves: Update[];
};

function repository(existing?: Update, rows: Update[] = []): RepoStub {
  const updates: Update[] = [];
  const saves: Update[] = [];
  const repo = {
    create: (data: Update) => ({ ...data }),
    save: jest.fn((data: Update) => {
      saves.push(data);
      return Promise.resolve(data);
    }),
    update: jest.fn((_id: string, data: Update) => {
      updates.push(data);
      return Promise.resolve({ affected: 1 });
    }),
    findOne: jest.fn(() => Promise.resolve(existing ?? null)),
    find: jest.fn(() => Promise.resolve(rows)),
  } as unknown as Repository<never>;
  return { repo, updates, saves };
}

function existing(kind: string, fields: Update = {}): Update {
  return { id: `${kind}-1`, createdAt: oldDate, updatedAt: oldDate, ...fields };
}

function setup(
  options: {
    brand?: Update;
    line?: Update;
    tobacco?: Update;
    cronEnabled?: boolean;
  } = {},
) {
  const brand = repository(options.brand, options.brand ? [options.brand] : []);
  const line = repository(options.line, options.line ? [options.line] : []);
  const tobacco = repository(options.tobacco);
  const flavor = repository({ id: 'flavor-1', name: 'Synthetic Mint' });
  const brandStrategy = new BrandParserStrategy();
  const lineStrategy = new LineParserStrategy();
  const tobaccoStrategy = new TobaccoParserStrategy();

  for (const strategy of [brandStrategy, lineStrategy, tobaccoStrategy]) {
    strategy.initialize = async () => {};
    strategy.close = async () => {};
  }
  brandStrategy.parseBrands = () => Promise.resolve([brandData]);
  brandStrategy.parseBrandByUrl = () => Promise.resolve(brandData);
  lineStrategy.parseLines = () => Promise.resolve([lineData]);
  lineStrategy.parseLineByUrl = () => Promise.resolve(lineData);
  tobaccoStrategy.parseTobaccos = () => Promise.resolve([tobaccoData]);
  tobaccoStrategy.parseTobaccoByUrl = () => Promise.resolve(tobaccoData);

  const service = new ParserService(
    brand.repo as unknown as Repository<Brand>,
    line.repo as unknown as Repository<Line>,
    tobacco.repo as unknown as Repository<Tobacco>,
    flavor.repo as unknown as Repository<Flavor>,
    brandStrategy,
    lineStrategy,
    tobaccoStrategy,
    { get: () => (options.cronEnabled ? 'true' : 'false') } as never,
  );
  return { service, brand, line, tobacco };
}

describe('ParserService createdAt updates', () => {
  it.each([
    [
      'manual brand parsing',
      async () => {
        const state = setup({
          brand: existing('brand', { name: brandData.name }),
        });
        await state.service.parseBrandsManually();
        return state.brand.updates[0];
      },
    ],
    [
      'brand URL parsing',
      async () => {
        const state = setup({
          brand: existing('brand', { slug: brandData.slug }),
        });
        await state.service.parseBrandByUrl('https://example.invalid/brand');
        return state.brand.updates[0];
      },
    ],
    [
      'daily brand parsing',
      async () => {
        const state = setup({
          cronEnabled: true,
          brand: existing('brand', {
            name: brandData.name,
            slug: brandData.slug,
          }),
          line: existing('line', {
            slug: lineData.slug,
            brandId: lineData.brandId,
          }),
          tobacco: existing('tobacco', {
            htreviewsId: tobaccoData.htreviewsId,
          }),
        });
        await state.service.handleDailyRefresh();
        return state.brand.updates[0];
      },
    ],
    [
      'line URL parsing',
      async () => {
        const state = setup({
          line: existing('line', { imageUrl: 'saved-image' }),
        });
        await state.service.parseLineByUrl(
          'https://example.invalid/line',
          'brand-1',
        );
        expect(state.line.updates[0].imageUrl).toBe('saved-image');
        return state.line.updates[0];
      },
    ],
    [
      'daily line parsing',
      async () => {
        const state = setup({
          cronEnabled: true,
          brand: existing('brand', {
            name: brandData.name,
            slug: brandData.slug,
          }),
          line: existing('line', {
            slug: lineData.slug,
            brandId: lineData.brandId,
            imageUrl: 'saved-image',
          }),
          tobacco: existing('tobacco', {
            htreviewsId: tobaccoData.htreviewsId,
          }),
        });
        await state.service.handleDailyRefresh();
        expect(state.line.updates[0].imageUrl).toBe('saved-image');
        return state.line.updates[0];
      },
    ],
    [
      'manual line parsing',
      async () => {
        const state = setup({
          brand: existing('brand', { slug: brandData.slug }),
          line: existing('line', {
            slug: lineData.slug,
            brandId: lineData.brandId,
            imageUrl: 'saved-image',
          }),
        });
        await state.service.parseLinesManually();
        expect(state.line.updates[0].imageUrl).toBe('saved-image');
        return state.line.updates[0];
      },
    ],
    [
      'tobacco URL parsing',
      async () => {
        const state = setup({ tobacco: existing('tobacco') });
        await state.service.parseTobaccoByUrl(
          'https://example.invalid/tobacco',
          'brand-1',
          'line-1',
        );
        expect(state.tobacco.updates[0].name).toBe(tobaccoData.name);
        expect(state.tobacco.saves[0].flavors).toEqual([
          { id: 'flavor-1', name: 'Synthetic Mint' },
        ]);
        return state.tobacco.updates[0];
      },
    ],
    [
      'manual tobacco parsing',
      async () => {
        const state = setup({
          line: existing('line', {
            slug: lineData.slug,
            brandId: lineData.brandId,
          }),
          tobacco: existing('tobacco', {
            htreviewsId: tobaccoData.htreviewsId,
          }),
        });
        await state.service.parseTobaccosManually();
        return state.tobacco.updates[0];
      },
    ],
    [
      'daily tobacco parsing',
      async () => {
        const state = setup({
          cronEnabled: true,
          brand: existing('brand', {
            name: brandData.name,
            slug: brandData.slug,
          }),
          line: existing('line', {
            slug: lineData.slug,
            brandId: lineData.brandId,
          }),
          tobacco: existing('tobacco', {
            htreviewsId: tobaccoData.htreviewsId,
          }),
        });
        await state.service.handleDailyRefresh();
        return state.tobacco.updates[0];
      },
    ],
  ])('preserves the stored timestamp on %s', async (_label, run) => {
    const update = await run();
    expect(update).toBeDefined();
    expect(update.createdAt).toBeUndefined();
    if (update.updatedAt !== undefined) {
      expect(update.updatedAt).toBeInstanceOf(Date);
    }
  });

  it('keeps normalizer timestamps on saved inserts', async () => {
    const state = setup();
    await state.service.parseBrandsManually();
    await state.service.parseLineByUrl(
      'https://example.invalid/line',
      'brand-1',
    );
    await state.service.parseTobaccoByUrl(
      'https://example.invalid/tobacco',
      'brand-1',
      'line-1',
    );
    expect(state.brand.saves).toHaveLength(1);
    expect(state.line.saves).toHaveLength(1);
    expect(state.tobacco.saves).toHaveLength(1);
    for (const saved of [
      ...state.brand.saves,
      ...state.line.saves,
      ...state.tobacco.saves,
    ]) {
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
    }
  });
});
