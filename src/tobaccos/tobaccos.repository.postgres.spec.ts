import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Brand } from '../brands/brands.entity';
import { Flavor } from '../flavors/flavors.entity';
import { Line } from '../lines/lines.entity';
import { Tobacco } from './tobaccos.entity';
import { TobaccosRepository } from './tobaccos.repository';

const describePostgres =
  process.env.POSTGRES_SEARCH_TESTS === 'true' ? describe : describe.skip;

describePostgres('TobaccosRepository PostgreSQL search', () => {
  const schema = `search_test_${randomUUID().replaceAll('-', '')}`;
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
  let repository: TobaccosRepository;

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
      entities: [Brand, Line, Tobacco, Flavor],
      synchronize: false,
    });
    await dataSource.initialize();
    await createFixtureTables();
    await insertFixtureData();
    repository = new TobaccosRepository(dataSource.getRepository(Tobacco));
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

  it.each([
    ['Tea 1.5', '1.5'],
    ['Mix 2.0', '2.0'],
  ])(
    'finds the decimal compound in "%s" for search "%s"',
    async (name, search) => {
      const result = await repository.findAll({ search });

      expect(result.total).toBe(1);
      expect(result.data.map((tobacco) => tobacco.name)).toEqual([name]);
    },
  );

  it('returns both fixture rows for a whitespace-only search', async () => {
    const result = await repository.findAll({ search: '  \t\n ' });

    expect(result.total).toBe(2);
    expect(new Set(result.data.map((tobacco) => tobacco.name))).toEqual(
      new Set(['Tea 1.5', 'Mix 2.0']),
    );
  });

  it('keeps AND flavor filtering unchanged when requested flavors repeat', async () => {
    const singleFlavor = await repository.findAll({ flavors: ['яблоко'] });
    const duplicateFlavor = await repository.findAll({
      flavors: ['яблоко', 'яблоко'],
    });
    const distinctFlavors = await repository.findAll({
      flavors: ['яблоко', 'мята'],
    });
    const mixedDuplicates = await repository.findAll({
      flavors: ['яблоко', 'яблоко', 'мята'],
    });
    const impossibleCombination = await repository.findAll({
      flavors: ['мята', 'лимон'],
    });

    expect(singleFlavor.data.map((tobacco) => tobacco.name).sort()).toEqual([
      'Mix 2.0',
      'Tea 1.5',
    ]);
    expect(duplicateFlavor.data.map((tobacco) => tobacco.name).sort()).toEqual([
      'Mix 2.0',
      'Tea 1.5',
    ]);
    expect(duplicateFlavor.total).toBe(singleFlavor.total);
    expect(distinctFlavors.data.map((tobacco) => tobacco.name)).toEqual([
      'Tea 1.5',
    ]);
    expect(mixedDuplicates.data.map((tobacco) => tobacco.name)).toEqual([
      'Tea 1.5',
    ]);
    expect(mixedDuplicates.total).toBe(distinctFlavors.total);
    expect(impossibleCombination.total).toBe(0);
  });

  it('treats a trailing tsquery operator as punctuation', async () => {
    const result = await repository.findAll({ search: 'Tea &' });

    expect(result.total).toBe(1);
    expect(result.data.map((tobacco) => tobacco.name)).toEqual(['Tea 1.5']);
  });

  describe('search relevance with nullable line', () => {
    beforeAll(async () => insertRelevanceFixtures());

    it.each(['mint', 'mint signal'])(
      'ranks tobacco and brand matches for "%s" before a weaker match with a line',
      async (search) => {
        const firstPage = await repository.findAll({ search, limit: 1 });
        const secondPage = await repository.findAll({
          search,
          limit: 1,
          page: 2,
        });
        const allResults = await repository.findAll({ search });

        expect(allResults.total).toBe(2);
        expect(allResults.data.map((tobacco) => tobacco.name)).toEqual([
          'Zzz mint mint mint',
          'Zzz mint',
        ]);
        expect(allResults.data[0].line).toBeNull();
        expect(firstPage.data.map((tobacco) => tobacco.name)).toEqual([
          'Zzz mint mint mint',
        ]);
        expect(secondPage.data.map((tobacco) => tobacco.name)).toEqual([
          'Zzz mint',
        ]);
      },
    );
  });

  it.each(["Tea'1.5", 'Tea\\1.5'])(
    'safely searches punctuation in %s as adjacent lexemes',
    async (search) => {
      const result = await repository.findAll({ search });

      expect(result.total).toBe(1);
      expect(result.data.map((tobacco) => tobacco.name)).toEqual(['Tea 1.5']);
    },
  );

  async function createFixtureTables(): Promise<void> {
    await dataSource.query(`
      CREATE TABLE ${quotedSchema}.brands (
        id uuid PRIMARY KEY,
        name varchar NOT NULL,
        slug varchar NOT NULL,
        country varchar NOT NULL,
        rating decimal(3, 2) NOT NULL DEFAULT 0,
        "ratingsCount" integer NOT NULL DEFAULT 0,
        description text,
        "logoUrl" varchar NOT NULL,
        status varchar NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await dataSource.query(`
      CREATE TABLE ${quotedSchema}.lines (
        id uuid PRIMARY KEY,
        name varchar NOT NULL,
        slug varchar NOT NULL,
        "brandId" uuid NOT NULL,
        description text,
        "imageUrl" varchar,
        rating decimal(3, 2) NOT NULL DEFAULT 0,
        "ratingsCount" integer NOT NULL DEFAULT 0,
        "strengthOfficial" varchar NOT NULL,
        "strengthByRatings" varchar NOT NULL,
        status varchar NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await dataSource.query(`
      CREATE TABLE ${quotedSchema}.tobaccos (
        id uuid PRIMARY KEY,
        name varchar NOT NULL,
        slug varchar NOT NULL,
        "brandId" uuid NOT NULL,
        "lineId" uuid,
        rating decimal(3, 2) NOT NULL DEFAULT 0,
        "ratingsCount" integer NOT NULL DEFAULT 0,
        "strengthOfficial" varchar NOT NULL,
        "strengthByRatings" varchar NOT NULL,
        status varchar NOT NULL,
        "htreviewsId" varchar NOT NULL UNIQUE,
        "imageUrl" varchar NOT NULL,
        description text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await dataSource.query(`
      CREATE TABLE ${quotedSchema}.flavors (
        id uuid PRIMARY KEY,
        name varchar NOT NULL UNIQUE,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);
    await dataSource.query(`
      CREATE TABLE ${quotedSchema}.tobacco_flavors (
        "tobaccoId" uuid NOT NULL,
        "flavorId" uuid NOT NULL,
        PRIMARY KEY ("tobaccoId", "flavorId")
      )
    `);
  }

  async function insertFixtureData(): Promise<void> {
    const brandId = randomUUID();
    await dataSource.query(
      `INSERT INTO ${quotedSchema}.brands
        (id, name, slug, country, "logoUrl", status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [brandId, 'Regression Brand', 'regression-brand', 'Russia', '', 'Active'],
    );

    const flavorIds = new Map<string, string>();
    for (const name of ['яблоко', 'мята', 'лимон']) {
      const id = randomUUID();
      flavorIds.set(name, id);
      await dataSource.query(
        `INSERT INTO ${quotedSchema}.flavors (id, name) VALUES ($1, $2)`,
        [id, name],
      );
    }

    const tobaccoFixtures: Array<[string, string, string, string[]]> = [
      ['Tea 1.5', 'tea-15', 'postgres-search-tea-15', ['яблоко', 'мята']],
      ['Mix 2.0', 'mix-20', 'postgres-search-mix-20', ['яблоко', 'лимон']],
    ];
    for (const [name, slug, htreviewsId, flavorNames] of tobaccoFixtures) {
      const tobaccoId = randomUUID();
      await dataSource.query(
        `INSERT INTO ${quotedSchema}.tobaccos
          (id, name, slug, "brandId", "strengthOfficial", "strengthByRatings",
           status, "htreviewsId", "imageUrl")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          tobaccoId,
          name,
          slug,
          brandId,
          'Medium',
          'Medium',
          'Active',
          htreviewsId,
          '',
        ],
      );
      for (const flavorName of flavorNames) {
        await dataSource.query(
          `INSERT INTO ${quotedSchema}.tobacco_flavors ("tobaccoId", "flavorId")
           VALUES ($1, $2)`,
          [tobaccoId, flavorIds.get(flavorName)],
        );
      }
    }
  }

  async function insertRelevanceFixtures(): Promise<void> {
    const brandId = randomUUID();
    const lineId = randomUUID();
    await dataSource.query(
      `INSERT INTO ${quotedSchema}.brands
        (id, name, slug, country, "logoUrl", status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        brandId,
        'Quiet Signal Brand',
        'quiet-signal-brand',
        'Russia',
        '',
        'Active',
      ],
    );
    await dataSource.query(
      `INSERT INTO ${quotedSchema}.lines
        (id, name, slug, "brandId", "strengthOfficial", "strengthByRatings", status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        lineId,
        'Quiet Line',
        'quiet-line',
        brandId,
        'Medium',
        'Medium',
        'Active',
      ],
    );

    const tobaccoFixtures: Array<[string, string, string, string | null]> = [
      ['Zzz mint mint mint', 'zzz-mint-mint-mint', 'htr900001', null],
      ['Zzz mint', 'zzz-mint', 'htr900002', lineId],
    ];
    for (const [name, slug, htreviewsId, fixtureLineId] of tobaccoFixtures) {
      await dataSource.query(
        `INSERT INTO ${quotedSchema}.tobaccos
          (id, name, slug, "brandId", "lineId", "strengthOfficial",
           "strengthByRatings", status, "htreviewsId", "imageUrl")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          randomUUID(),
          name,
          slug,
          brandId,
          fixtureLineId,
          'Medium',
          'Medium',
          'Active',
          htreviewsId,
          '',
        ],
      );
    }
  }
});
