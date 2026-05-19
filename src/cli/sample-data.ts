import type { FindOptionsWhere } from 'typeorm';
import { ApiKey } from '../api-keys/api-keys.entity';
import { Brand } from '../brands/brands.entity';
import { Flavor } from '../flavors/flavors.entity';
import { Line } from '../lines/lines.entity';
import { Tobacco } from '../tobaccos/tobaccos.entity';

export const LOCAL_DEV_API_KEY = 'local-dev-key';

interface SeedRepository<T extends { id: string }> {
  findOne(options: { where: FindOptionsWhere<T> }): Promise<T | null>;
  create(data: Partial<T>): T;
  merge(target: T, source: Partial<T>): T;
  save(entity: T): Promise<T>;
}

export interface SampleDataRepositories {
  apiKeyRepository: SeedRepository<ApiKey>;
  brandRepository: SeedRepository<Brand>;
  lineRepository: SeedRepository<Line>;
  flavorRepository: SeedRepository<Flavor>;
  tobaccoRepository: SeedRepository<Tobacco>;
}

interface SeedCounter {
  created: number;
  updated: number;
}

export interface SampleSeedResult {
  apiKeys: SeedCounter;
  brands: SeedCounter;
  lines: SeedCounter;
  flavors: SeedCounter;
  tobaccos: SeedCounter;
}

interface UpsertResult<T> {
  entity: T;
  action: keyof SeedCounter;
}

const SAMPLE_BRANDS = [
  {
    name: 'Demo Clouds',
    slug: 'demo-clouds',
    country: 'Россия',
    rating: 4.62,
    ratingsCount: 128,
    description: 'Synthetic sample brand for local development.',
    logoUrl: 'https://example.com/demo-clouds.png',
    status: 'В продаже',
  },
  {
    name: 'North Garden',
    slug: 'north-garden',
    country: 'Германия',
    rating: 4.31,
    ratingsCount: 74,
    description: 'Synthetic imported-style brand for API examples.',
    logoUrl: 'https://example.com/north-garden.png',
    status: 'В продаже',
  },
] satisfies Array<Partial<Brand> & { slug: string }>;

const SAMPLE_LINES = [
  {
    brandSlug: 'demo-clouds',
    name: 'Classic Mix',
    slug: 'classic-mix',
    description: 'Balanced everyday sample line.',
    imageUrl: 'https://example.com/classic-mix.png',
    rating: 4.48,
    ratingsCount: 63,
    strengthOfficial: 'Средняя',
    strengthByRatings: 'Средняя',
    status: 'В продаже',
  },
  {
    brandSlug: 'north-garden',
    name: 'Nordic Reserve',
    slug: 'nordic-reserve',
    description: 'Cool fruit-forward sample line.',
    imageUrl: 'https://example.com/nordic-reserve.png',
    rating: 4.27,
    ratingsCount: 41,
    strengthOfficial: 'Легкая',
    strengthByRatings: 'Легкая',
    status: 'В продаже',
  },
];

const SAMPLE_FLAVORS = ['яблоко', 'мята', 'лимон', 'ягоды', 'чай'];

const SAMPLE_TOBACCOS = [
  {
    brandSlug: 'demo-clouds',
    lineSlug: 'classic-mix',
    name: 'Apple Mint',
    slug: 'apple-mint',
    rating: 4.71,
    ratingsCount: 37,
    strengthOfficial: 'Средняя',
    strengthByRatings: 'Средняя',
    status: 'В продаже',
    htreviewsId: 'sample-demo-clouds-classic-mix-apple-mint',
    imageUrl: 'https://example.com/apple-mint.png',
    description: 'Synthetic apple and mint sample tobacco.',
    flavors: ['яблоко', 'мята'],
  },
  {
    brandSlug: 'demo-clouds',
    lineSlug: 'classic-mix',
    name: 'Lemon Tea',
    slug: 'lemon-tea',
    rating: 4.19,
    ratingsCount: 22,
    strengthOfficial: 'Средняя',
    strengthByRatings: 'Средняя',
    status: 'В продаже',
    htreviewsId: 'sample-demo-clouds-classic-mix-lemon-tea',
    imageUrl: 'https://example.com/lemon-tea.png',
    description: 'Synthetic lemon tea sample tobacco.',
    flavors: ['лимон', 'чай'],
  },
  {
    brandSlug: 'north-garden',
    lineSlug: 'nordic-reserve',
    name: 'Berry Frost',
    slug: 'berry-frost',
    rating: 4.36,
    ratingsCount: 29,
    strengthOfficial: 'Легкая',
    strengthByRatings: 'Легкая',
    status: 'В продаже',
    htreviewsId: 'sample-north-garden-nordic-reserve-berry-frost',
    imageUrl: 'https://example.com/berry-frost.png',
    description: 'Synthetic berry and mint sample tobacco.',
    flavors: ['ягоды', 'мята'],
  },
];

async function upsertBy<T extends { id: string }>(
  repository: SeedRepository<T>,
  where: FindOptionsWhere<T>,
  data: Partial<T>,
): Promise<UpsertResult<T>> {
  const existing = await repository.findOne({ where });
  const now = new Date();

  if (existing) {
    repository.merge(existing, {
      ...data,
      updatedAt: now,
    } as Partial<T>);
    return { entity: await repository.save(existing), action: 'updated' };
  }

  const entity = repository.create({
    ...data,
    createdAt: now,
    updatedAt: now,
  } as Partial<T>);
  return { entity: await repository.save(entity), action: 'created' };
}

function increment(counter: SeedCounter, action: keyof SeedCounter): void {
  counter[action]++;
}

export async function seedSampleData(
  repositories: SampleDataRepositories,
): Promise<SampleSeedResult> {
  const result: SampleSeedResult = {
    apiKeys: { created: 0, updated: 0 },
    brands: { created: 0, updated: 0 },
    lines: { created: 0, updated: 0 },
    flavors: { created: 0, updated: 0 },
    tobaccos: { created: 0, updated: 0 },
  };

  const apiKey = await upsertBy(
    repositories.apiKeyRepository,
    { key: LOCAL_DEV_API_KEY },
    {
      key: LOCAL_DEV_API_KEY,
      name: 'Local Development',
      isActive: true,
    },
  );
  increment(result.apiKeys, apiKey.action);

  const brandsBySlug = new Map<string, Brand>();
  for (const sampleBrand of SAMPLE_BRANDS) {
    const { entity, action } = await upsertBy(
      repositories.brandRepository,
      { slug: sampleBrand.slug },
      sampleBrand,
    );
    brandsBySlug.set(sampleBrand.slug, entity);
    increment(result.brands, action);
  }

  const linesBySlug = new Map<string, Line>();
  for (const sampleLine of SAMPLE_LINES) {
    const brand = brandsBySlug.get(sampleLine.brandSlug);
    if (!brand) {
      throw new Error(`Missing sample brand for slug: ${sampleLine.brandSlug}`);
    }

    const { entity, action } = await upsertBy(
      repositories.lineRepository,
      { slug: sampleLine.slug, brandId: brand.id },
      {
        name: sampleLine.name,
        slug: sampleLine.slug,
        description: sampleLine.description,
        imageUrl: sampleLine.imageUrl,
        rating: sampleLine.rating,
        ratingsCount: sampleLine.ratingsCount,
        strengthOfficial: sampleLine.strengthOfficial,
        strengthByRatings: sampleLine.strengthByRatings,
        status: sampleLine.status,
        brandId: brand.id,
        brand,
      },
    );
    linesBySlug.set(`${sampleLine.brandSlug}/${sampleLine.slug}`, entity);
    increment(result.lines, action);
  }

  const flavorsByName = new Map<string, Flavor>();
  for (const flavorName of SAMPLE_FLAVORS) {
    const { entity, action } = await upsertBy(
      repositories.flavorRepository,
      { name: flavorName },
      { name: flavorName },
    );
    flavorsByName.set(flavorName, entity);
    increment(result.flavors, action);
  }

  for (const sampleTobacco of SAMPLE_TOBACCOS) {
    const brand = brandsBySlug.get(sampleTobacco.brandSlug);
    const line = linesBySlug.get(
      `${sampleTobacco.brandSlug}/${sampleTobacco.lineSlug}`,
    );

    if (!brand || !line) {
      throw new Error(
        `Missing sample relation for tobacco: ${sampleTobacco.htreviewsId}`,
      );
    }

    const tobaccoFlavors = sampleTobacco.flavors.map((flavorName) => {
      const flavor = flavorsByName.get(flavorName);
      if (!flavor) {
        throw new Error(`Missing sample flavor: ${flavorName}`);
      }
      return flavor;
    });

    const { action } = await upsertBy(
      repositories.tobaccoRepository,
      { htreviewsId: sampleTobacco.htreviewsId },
      {
        name: sampleTobacco.name,
        slug: sampleTobacco.slug,
        rating: sampleTobacco.rating,
        ratingsCount: sampleTobacco.ratingsCount,
        strengthOfficial: sampleTobacco.strengthOfficial,
        strengthByRatings: sampleTobacco.strengthByRatings,
        status: sampleTobacco.status,
        htreviewsId: sampleTobacco.htreviewsId,
        imageUrl: sampleTobacco.imageUrl,
        description: sampleTobacco.description,
        brandId: brand.id,
        brand,
        lineId: line.id,
        line,
        flavors: tobaccoFlavors,
      },
    );
    increment(result.tobaccos, action);
  }

  return result;
}
