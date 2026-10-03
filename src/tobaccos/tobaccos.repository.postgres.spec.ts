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
    await adminDataSource.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await adminDataSource.query('CREATE EXTENSION IF NOT EXISTS fuzzystrmatch');
    await adminDataSource.query(`CREATE SCHEMA ${quotedSchema}`);

    dataSource = new DataSource({
      ...connectionOptions,
      schema,
      extra: { options: `-c search_path=${schema},public` },
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

  it.each([
    ['Tea 1.5', '1'],
    ['Mix 2.0', '2'],
  ])('finds numeric prefix %s for search %s', async (name, search) => {
    const result = await repository.findAll({ search });

    expect(result.total).toBe(1);
    expect(result.data.map((tobacco) => tobacco.name)).toEqual([name]);
  });

  it('returns both fixture rows for a whitespace-only search', async () => {
    const result = await repository.findAll({ search: '  \t\n ' });

    expect(result.total).toBe(2);
    expect(new Set(result.data.map((tobacco) => tobacco.name))).toEqual(
      new Set(['Tea 1.5', 'Mix 2.0']),
    );
  });

  it('sorts the joined page by the dateAdded alias mapped to createdAt', async () => {
    const ascending = await repository.findAll({
      sortBy: 'dateAdded',
      order: 'asc',
      limit: 1,
    });
    const descending = await repository.findAll({
      sortBy: 'dateAdded',
      order: 'desc',
      limit: 1,
    });

    expect(ascending.total).toBe(2);
    expect(ascending.data.map((tobacco) => tobacco.name)).toEqual(['Tea 1.5']);
    expect(descending.total).toBe(2);
    expect(descending.data.map((tobacco) => tobacco.name)).toEqual(['Mix 2.0']);
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

  describe('indexed catalog search behavior', () => {
    beforeAll(async () => insertCatalogSearchFixtures());

    it('prioritizes the complete tobacco name and searches brand plus tobacco name', async () => {
      const exactName = await repository.findAll({ search: 'Ice Cream' });
      const brandAndName = await repository.findAll({
        search: 'Darkside Cola Ice Cream',
      });

      expect(exactName.data.map((tobacco) => tobacco.name)).toEqual([
        'Ice Cream',
        'Ice Cream Pistachio',
        'Vanilla Ice Cream',
      ]);
      expect(brandAndName.total).toBe(2);
      expect(brandAndName.data.map((tobacco) => tobacco.name).sort()).toEqual([
        'Ice Cream',
        'Ice Cream Pistachio',
      ]);
    });

    it('matches joined and separated brand spellings without matching an interior prefix', async () => {
      const separated = await repository.findAll({ search: 'black burn' });
      const joined = await repository.findAll({ search: 'blackburn' });
      const interior = await repository.findAll({ search: 'col' });

      expect(separated.data.map((tobacco) => tobacco.name)).toEqual(['Berry']);
      expect(joined.data.map((tobacco) => tobacco.name)).toEqual(['Berry']);
      expect(interior.total).toBe(2);
      expect(
        interior.data.every(
          (tobacco) => tobacco.brand?.name === 'Darkside Cola',
        ),
      ).toBe(true);
    });

    it('matches joined terms inside names only at a word boundary', async () => {
      const separated = await repository.findAll({ search: 'ice cream' });
      const joined = await repository.findAll({ search: 'icecream' });
      const interior = await repository.findAll({ search: 'col' });

      expect(separated.total).toBe(3);
      expect(joined.total).toBe(3);
      expect(new Set(joined.data.map((tobacco) => tobacco.id))).toEqual(
        new Set(separated.data.map((tobacco) => tobacco.id)),
      );
      expect(joined.data.map((tobacco) => tobacco.name)).toContain(
        'Vanilla Ice Cream',
      );
      expect(interior.data.map((tobacco) => tobacco.name)).not.toContain(
        'Chocolate',
      );
    });

    it('supports Russian phonetic spellings and marks conservative typo matches', async () => {
      const cyrillic = await repository.findAll({ search: 'дарксайд кола' });
      const typo = await repository.findAll({ search: 'darkside colla' });
      const joinedTypo = await repository.findAll({ search: 'darksidecolla' });

      expect(cyrillic.total).toBe(2);
      expect(new Set(cyrillic.data.map((tobacco) => tobacco.name))).toEqual(
        new Set(['Ice Cream', 'Ice Cream Pistachio']),
      );
      expect(cyrillic.search).toMatchObject({ matchQuality: 'approximate' });
      expect(cyrillic.search?.approximateResultIds).toHaveLength(2);
      expect(typo.total).toBe(2);
      expect(new Set(typo.data.map((tobacco) => tobacco.name))).toEqual(
        new Set(['Ice Cream', 'Ice Cream Pistachio']),
      );
      expect(typo.search).toMatchObject({ matchQuality: 'approximate' });
      expect(typo.search?.approximateResultIds).toHaveLength(2);
      expect(joinedTypo.total).toBe(2);
      expect(new Set(joinedTypo.data.map((tobacco) => tobacco.name))).toEqual(
        new Set(['Ice Cream', 'Ice Cream Pistachio']),
      );
      expect(joinedTypo.search?.approximateResultIds).toHaveLength(2);
    });

    it('keeps literal stopwords searchable and permits an explicit approximate fallback', async () => {
      const literal = await repository.findAll({ search: 'with lemon' });
      const stopwordsOnly = await repository.findAll({ search: 'with the' });

      expect(literal.total).toBe(1);
      expect(literal.data[0].name).toBe('With Lemon');
      expect(stopwordsOnly.total).toBe(0);
    });

    it('uses current brand and line names after catalog updates', async () => {
      const beforeRename = await repository.findAll({ search: 'Old Signal' });
      await dataSource.query(
        `UPDATE ${quotedSchema}.brands SET name = 'New Signal' WHERE name = 'Old Signal'`,
      );
      const afterRename = await repository.findAll({ search: 'New Signal' });
      const beforeLineRename = await repository.findAll({ search: 'Old Line' });
      await dataSource.query(
        `UPDATE ${quotedSchema}.lines SET name = 'New Line' WHERE name = 'Old Line'`,
      );
      const afterLineRename = await repository.findAll({ search: 'New Line' });

      expect(beforeRename.total).toBe(3);
      expect(afterRename.total).toBe(3);
      expect(beforeLineRename.total).toBe(5);
      expect(afterLineRename.total).toBe(5);
    });

    it('keeps repeated terms and page boundaries deterministic', async () => {
      const first = await repository.findAll({ search: 'ice ice', limit: 1 });
      const second = await repository.findAll({
        search: 'ice ice',
        limit: 1,
        page: 2,
      });

      expect(first.total).toBe(3);
      expect(second.total).toBe(3);
      expect(first.data[0].id).not.toBe(second.data[0].id);
    });
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

    const tobaccoFixtures: Array<[string, string, string, string, string[]]> = [
      [
        'Tea 1.5',
        'tea-15',
        'postgres-search-tea-15',
        '2020-01-01T00:00:00.000Z',
        ['яблоко', 'мята'],
      ],
      [
        'Mix 2.0',
        'mix-20',
        'postgres-search-mix-20',
        '2022-01-01T00:00:00.000Z',
        ['яблоко', 'лимон'],
      ],
    ];
    for (const [
      name,
      slug,
      htreviewsId,
      createdAt,
      flavorNames,
    ] of tobaccoFixtures) {
      const tobaccoId = randomUUID();
      await dataSource.query(
        `INSERT INTO ${quotedSchema}.tobaccos
          (id, name, slug, "brandId", "strengthOfficial", "strengthByRatings",
           status, "htreviewsId", "imageUrl", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
          createdAt,
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

  async function insertCatalogSearchFixtures(): Promise<void> {
    const darksideId = randomUUID();
    const blackburnId = randomUUID();
    const oldSignalId = randomUUID();
    const creameryId = randomUUID();
    await dataSource.query(
      `INSERT INTO ${quotedSchema}.brands (id, name, slug, country, "logoUrl", status)
       VALUES ($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12), ($13, $14, $15, $16, $17, $18), ($19, $20, $21, $22, $23, $24)`,
      [
        darksideId,
        'Darkside Cola',
        'darkside-cola',
        'Russia',
        '',
        'Active',
        creameryId,
        'Creamery',
        'creamery',
        'Russia',
        '',
        'Active',
        blackburnId,
        'Blackburn',
        'blackburn',
        'Russia',
        '',
        'Active',
        oldSignalId,
        'Old Signal',
        'old-signal',
        'Russia',
        '',
        'Active',
      ],
    );

    const lineId = randomUUID();
    await dataSource.query(
      `INSERT INTO ${quotedSchema}.lines
        (id, name, slug, "brandId", "strengthOfficial", "strengthByRatings", status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        lineId,
        'Old Line',
        'old-line',
        oldSignalId,
        'Medium',
        'Medium',
        'Active',
      ],
    );

    const fixtures: Array<[string, string, string, string | null]> = [
      ['Ice Cream', darksideId, lineId, 'htr910001'],
      ['Ice Cream Pistachio', darksideId, lineId, 'htr910002'],
      ['Berry', blackburnId, null, 'htr910003'],
      ['Fresh', oldSignalId, lineId, 'htr910004'],
      ['Mint', oldSignalId, lineId, 'htr910005'],
      ['With Lemon', oldSignalId, lineId, 'htr910006'],
      ['Vanilla Ice Cream', creameryId, null, 'htr910007'],
      ['Chocolate', creameryId, null, 'htr910008'],
    ];
    for (const [name, brandId, fixtureLineId, htreviewsId] of fixtures) {
      await dataSource.query(
        `INSERT INTO ${quotedSchema}.tobaccos
          (id, name, slug, "brandId", "lineId", "strengthOfficial",
           "strengthByRatings", status, "htreviewsId", "imageUrl")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          randomUUID(),
          name,
          `${name.toLowerCase().replaceAll(' ', '-')}-${htreviewsId}`,
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
