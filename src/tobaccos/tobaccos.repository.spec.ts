import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  EntityManager,
  FindManyOptions,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { FindTobaccosDto } from './dto/find-tobaccos.dto';
import { Tobacco } from './tobaccos.entity';
import { TobaccosRepository } from './tobaccos.repository';

/* eslint-disable @typescript-eslint/unbound-method */
describe('TobaccosRepository', () => {
  let repository: TobaccosRepository;
  let tobaccoRepository: jest.Mocked<Repository<Tobacco>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Tobacco>>;
  let manager: Repository<Tobacco>['manager'];
  let sqlQuery: jest.MockedFunction<
    (sql: string, parameters?: unknown[]) => Promise<unknown[]>
  >;
  let transactionMock: jest.Mock;
  let findPageMock: jest.MockedFunction<
    (options: FindManyOptions<Tobacco>) => Promise<Tobacco[]>
  >;
  const tobacco = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Ice Cream',
    slug: 'ice-cream',
    brandId: 'brand-id',
    brand: null,
    lineId: null,
    line: null,
    rating: 4.5,
    ratingsCount: 50,
    strengthOfficial: 'Medium',
    strengthByRatings: 'Medium',
    status: 'Active',
    htreviewsId: 'htr123',
    imageUrl: '',
    description: null,
    flavors: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as Tobacco;

  beforeEach(async () => {
    sqlQuery = jest.fn((sql: string) =>
      Promise.resolve(
        sql.startsWith('SET ')
          ? []
          : [{ total: 7, id: tobacco.id, exact_count: 2 }],
      ),
    );
    transactionMock = jest.fn(
      (
        _isolation: string,
        callback: (manager: EntityManager) => Promise<unknown>,
      ) => callback(manager),
    );
    findPageMock = jest.fn(() => Promise.resolve([tobacco]));
    const connection = {
      getMetadata: (entity: { name: string } | string) => ({
        tableName:
          typeof entity === 'string' ? entity : `${entity.name.toLowerCase()}s`,
        schema: 'search_test',
      }),
      driver: { escape: (identifier: string) => `"${identifier}"` },
      options: { schema: 'search_test' },
    };
    manager = {
      query: sqlQuery,
      transaction: transactionMock,
      connection,
      getRepository: jest.fn().mockReturnValue({ find: findPageMock }),
    } as unknown as Repository<Tobacco>['manager'];
    queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getRawMany: jest.fn(),
      getOne: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Tobacco>>;
    tobaccoRepository = {
      manager,
      metadata: { schema: 'search_test' },
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<Tobacco>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TobaccosRepository,
        { provide: getRepositoryToken(Tobacco), useValue: tobaccoRepository },
      ],
    }).compile();
    repository = module.get<TobaccosRepository>(TobaccosRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('counts and pages catalog IDs before hydrating only the page relations', async () => {
      const result = await repository.findAll({ page: 2, limit: 3 });
      const queries = sqlQuery.mock.calls;

      expect(result).toEqual({ data: [tobacco], total: 7 });
      expect(queries).toHaveLength(2);
      expect(queries[1][0]).toContain('COUNT(*)');
      expect(queries[1][0]).toContain('OFFSET $1 LIMIT $2');
      expect(queries[1][1]).toEqual([3, 3]);
      expect(findPageMock).toHaveBeenCalledTimes(1);
      const findOptions = findPageMock.mock.calls[0]?.[0];
      expect(Object.keys(findOptions?.where ?? {})).toEqual(['id']);
      expect(findOptions?.relations).toEqual({
        brand: true,
        line: true,
        flavors: true,
      });
    });

    it('builds indexed per-field candidate sets and intersects terms for cross-field AND', async () => {
      await repository.findAll({ search: 'cola darks' });
      const queries = sqlQuery.mock.calls;
      const countSql = queries.find(([sql]) =>
        String(sql).includes('COUNT(*)'),
      )?.[0] as string;

      expect(countSql).toContain("to_tsvector('simple'");
      expect(countSql).toContain("to_tsvector('russian'");
      expect(countSql).toContain("to_tsvector('english'");
      expect(countSql).toContain('UNION ALL');
      expect(countSql).toContain('JOIN term_1 t1 ON t1.id = t0.id');
      expect(countSql).toContain('%>');
      expect(countSql).not.toContain('JOIN tobacco_flavors');
    });

    it.each(['c', 'co', 'м', 'a', '1', '1.5'])(
      'keeps short prefixes and decimals on lexical full-text candidates: %s',
      async (search) => {
        await repository.findAll({ search });
        const countSql = sqlQuery.mock.calls.find(([sql]) =>
          String(sql).includes('COUNT(*)'),
        )?.[0] as string;

        expect(countSql).toContain("to_tsvector('simple'");
        expect(countSql).not.toContain("LIKE '%' ||");
        expect(countSql).not.toContain('%>');
        expect(countSql).not.toContain('similarity(');
      },
    );

    it('keeps filters and all-flavor matching inside the exact count and page queries', async () => {
      await repository.findAll({
        brandId: 'brand-id',
        lineId: 'line-id',
        minRating: 3,
        maxRating: 5,
        country: 'Russia',
        status: 'Active',
        flavors: ['mint', 'mint', 'lemon'],
        search: 'ice cream',
      });
      const queries = sqlQuery.mock.calls;
      const countCall = queries.find(([sql]) =>
        String(sql).includes('COUNT(*)'),
      );
      const countSql = countCall?.[0] as string;
      const parameters = countCall?.[1] as unknown[];
      const pageSql = countSql;

      expect(countSql).toContain('t."brandId" = $1');
      expect(countSql).toContain('t."lineId" = $2');
      expect(countSql).toContain('t.rating >= $3');
      expect(countSql).toContain('t.rating <= $4');
      expect(countSql).toContain('filter_brand.country = $5');
      expect(countSql).toContain('t.status = $6');
      expect(countSql).toContain('HAVING COUNT(DISTINCT f.id) = $8');
      expect(countSql).toContain('t.id IN (\n        SELECT tf."tobaccoId"');
      expect(countSql).not.toContain('tf."tobaccoId" = t.id');
      expect(pageSql).toContain('HAVING COUNT(DISTINCT f.id) = $8');
      expect(parameters.slice(0, 8)).toEqual([
        'brand-id',
        'line-id',
        3,
        5,
        'Russia',
        'Active',
        ['mint', 'lemon'],
        2,
      ]);
    });

    it('keeps strict matches above fuzzy matches and labels approximate pages', async () => {
      sqlQuery.mockImplementation((sql: string) =>
        Promise.resolve(
          sql.startsWith('SET ')
            ? []
            : [{ total: 1, id: tobacco.id, exact_count: 0 }],
        ),
      );

      const result = await repository.findAll({ search: 'darksaid' });

      expect(result.search).toEqual({
        matchQuality: 'approximate',
        approximateResultIds: [tobacco.id],
      });
      const calls = sqlQuery.mock.calls;
      const pageSql = calls.find(([sql]) =>
        String(sql).includes('OFFSET'),
      )?.[0] as string;
      expect(pageSql).toContain('filtered.exact_count DESC');
      expect(pageSql).toContain('filtered.ratings_count DESC, filtered.id ASC');
    });

    it('treats whitespace as browse and nonempty punctuation as zero matches', async () => {
      const browse = await repository.findAll({ search: ' \t\n ' });
      const queryCountBefore = sqlQuery.mock.calls.length;
      const punctuation = await repository.findAll({ search: '!!!' });

      expect(browse.total).toBe(7);
      expect(punctuation).toEqual({ data: [], total: 0 });
      expect(sqlQuery.mock.calls).toHaveLength(queryCountBefore);
    });

    it('bounds query length and term count at the repository boundary', async () => {
      await expect(
        repository.findAll({ search: 'x'.repeat(129) }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        repository.findAll({
          search: 'one two three four five six seven eight nine',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(transactionMock).not.toHaveBeenCalled();
    });

    it.each(['views', 'unsupported', 'toString', '__proto__'])(
      'rejects unsupported direct sort field %s',
      async (sortBy) => {
        await expect(
          repository.findAll({ sortBy } as FindTobaccosDto),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(transactionMock).not.toHaveBeenCalled();
      },
    );

    it('rejects unsupported direct sort order', async () => {
      await expect(
        repository.findAll({ order: 'desc,unsupported' } as FindTobaccosDto),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(transactionMock).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('loads the tobacco relations', async () => {
      tobaccoRepository.findOne.mockResolvedValue(tobacco);
      await expect(repository.findOne(tobacco.id)).resolves.toBe(tobacco);
      expect(tobaccoRepository.findOne).toHaveBeenCalledWith({
        where: { id: tobacco.id },
        relations: ['brand', 'line', 'flavors'],
      });
    });
  });
});
