import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityTarget,
  In,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { Brand } from '../brands/brands.entity';
import { Flavor } from '../flavors/flavors.entity';
import { Line } from '../lines/lines.entity';
import { Tobacco } from './tobaccos.entity';
import { FindTobaccosDto } from './dto/find-tobaccos.dto';
import {
  compactSearchText,
  exactSearchSpellings,
  normalizeSearch,
  searchSpellings,
} from './search-normalizer';

const TOBACCO_SORT_FIELDS = {
  rating: 't.rating',
  name: 't.name',
  dateAdded: 't."createdAt"',
} as const;
const SEARCH_COMPACT = (column: string) =>
  `regexp_replace(replace(lower(normalize(${column}, NFKC)), 'ё', 'е'), '[^[:alnum:]]+', '', 'g')`;
const SEARCH_NORMALIZED = (column: string) =>
  `regexp_replace(replace(lower(normalize(${column}, NFKC)), 'ё', 'е'), '[^[:alnum:]]+', ' ', 'g')`;
const ENGLISH_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'by',
  'for',
  'from',
  'in',
  'into',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);
const RUSSIAN_STOPWORDS = new Set([
  'а',
  'без',
  'в',
  'во',
  'для',
  'до',
  'из',
  'к',
  'на',
  'над',
  'не',
  'о',
  'от',
  'по',
  'под',
  'при',
  'с',
  'со',
  'у',
  'и',
]);

function escapeTablePath(
  connection: DataSource,
  defaultSchema: string | undefined,
  entity: EntityTarget<ObjectLiteral> | string,
): string {
  const metadata =
    typeof entity === 'string' ? undefined : connection.getMetadata(entity);
  const tableName =
    metadata?.tableName ?? (typeof entity === 'string' ? entity : undefined);
  if (!tableName) {
    throw new Error('Cannot resolve catalog table metadata');
  }
  const schema: string | undefined = metadata?.schema ?? defaultSchema;
  const escape = (identifier: string) => connection.driver.escape(identifier);
  return schema ? `${escape(schema)}.${escape(tableName)}` : escape(tableName);
}

function queryRows<T>(result: unknown): T[] {
  if (!Array.isArray(result)) {
    throw new Error('Expected a row array from PostgreSQL');
  }
  return result as T[];
}

function toBoundarySequencePattern(compactTerm: string): string {
  const sequence = [...compactTerm].join('[^[:alnum:]]*');
  return `(^|[^[:alnum:]])${sequence}`;
}

function getSortField(sortBy: unknown): string {
  if (
    typeof sortBy !== 'string' ||
    !Object.prototype.hasOwnProperty.call(TOBACCO_SORT_FIELDS, sortBy)
  ) {
    throw new BadRequestException('Unsupported tobacco sort field');
  }
  return TOBACCO_SORT_FIELDS[sortBy as keyof typeof TOBACCO_SORT_FIELDS];
}

function getSortOrder(order: unknown): 'ASC' | 'DESC' {
  if (order !== 'asc' && order !== 'desc') {
    throw new BadRequestException('Unsupported sort order');
  }
  return order.toUpperCase() as 'ASC' | 'DESC';
}

interface SearchResultMetadata {
  matchQuality: 'approximate';
  approximateResultIds: string[];
}

@Injectable()
export class TobaccosRepository {
  constructor(
    @InjectRepository(Tobacco)
    private readonly tobaccoRepository: Repository<Tobacco>,
  ) {}

  async findAll(query: FindTobaccosDto): Promise<{
    data: Tobacco[];
    total: number;
    search?: SearchResultMetadata;
  }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'rating',
      order = 'desc',
      brandId,
      lineId,
      minRating,
      maxRating,
      country,
      status,
      search,
      flavors,
    } = query;
    const skip = (page - 1) * limit;
    const sortField = getSortField(sortBy);
    const sortOrder = getSortOrder(order);
    const normalizedSearch =
      search === undefined ? undefined : normalizeSearch(search);
    const searchTerms = normalizedSearch?.terms ?? [];
    const invalidNonemptySearch =
      normalizedSearch?.hasVisibleInput === true && searchTerms.length === 0;
    if (invalidNonemptySearch) {
      return { data: [], total: 0 };
    }
    const tables = {
      tobacco: escapeTablePath(
        this.tobaccoRepository.manager.connection,
        this.tobaccoRepository.metadata.schema,
        Tobacco,
      ),
      brand: escapeTablePath(
        this.tobaccoRepository.manager.connection,
        this.tobaccoRepository.metadata.schema,
        Brand,
      ),
      line: escapeTablePath(
        this.tobaccoRepository.manager.connection,
        this.tobaccoRepository.metadata.schema,
        Line,
      ),
      flavor: escapeTablePath(
        this.tobaccoRepository.manager.connection,
        this.tobaccoRepository.metadata.schema,
        Flavor,
      ),
      tobaccoFlavor: escapeTablePath(
        this.tobaccoRepository.manager.connection,
        this.tobaccoRepository.metadata.schema,
        'tobacco_flavors',
      ),
    };

    const parameters: unknown[] = [];
    const bind = (value: unknown): string => {
      parameters.push(value);
      return `$${parameters.length}`;
    };
    const where: string[] = [];
    if (brandId) where.push(`t."brandId" = ${bind(brandId)}`);
    if (lineId) where.push(`t."lineId" = ${bind(lineId)}`);
    if (minRating !== undefined) where.push(`t.rating >= ${bind(minRating)}`);
    if (maxRating !== undefined) where.push(`t.rating <= ${bind(maxRating)}`);
    if (country) where.push(`filter_brand.country = ${bind(country)}`);
    if (status) where.push(`t.status = ${bind(status)}`);
    if (flavors?.length) {
      const uniqueFlavors = [...new Set(flavors)];
      const flavorNames = bind(uniqueFlavors);
      const flavorsCount = bind(uniqueFlavors.length);
      where.push(`t.id IN (
        SELECT tf."tobaccoId" FROM ${tables.tobaccoFlavor} tf
        JOIN ${tables.flavor} f ON f.id = tf."flavorId"
        WHERE f.name = ANY(${flavorNames}::varchar[])
        GROUP BY tf."tobaccoId"
        HAVING COUNT(DISTINCT f.id) = ${flavorsCount}
      )`);
    }

    const termCtes: string[] = [];
    const isStopword = (term: string) =>
      ENGLISH_STOPWORDS.has(term.toLocaleLowerCase('en-US')) ||
      RUSSIAN_STOPWORDS.has(term.toLocaleLowerCase('ru-RU'));
    const hasNonStopwordTerm = searchTerms.some((term) => !isStopword(term));
    const compactWhole = searchTerms.length
      ? compactSearchText(searchTerms.join(''))
      : '';
    const wholeQueryMatches =
      searchTerms.length > 1 && [...compactWhole].length >= 3
        ? (() => {
            const whole = bind(compactWhole);
            const columns = [`t.name`, `b.name`, `l.name`];
            const exactBranches = columns.map(
              (column) => `SELECT t.id FROM ${tables.tobacco} t
          LEFT JOIN ${tables.brand} b ON b.id = t."brandId"
          LEFT JOIN ${tables.line} l ON l.id = t."lineId"
          WHERE ${SEARCH_COMPACT(column)} = ${whole}`,
            );
            const fuzzyBranches = columns.map((column) => {
              const compactField = SEARCH_COMPACT(column);
              const maxEdits = `CASE WHEN length(${whole}) <= 5 THEN 1 ELSE 2 END`;
              return `SELECT t.id FROM ${tables.tobacco} t
          LEFT JOIN ${tables.brand} b ON b.id = t."brandId"
          LEFT JOIN ${tables.line} l ON l.id = t."lineId"
              WHERE length(${whole}) >= 4 AND ${compactField} % ${whole}
            AND similarity(${whole}, ${compactField}) >= 0.15
            AND CASE
              WHEN char_length(${compactField}) <= 255 AND char_length(${whole}) <= 255
              THEN levenshtein_less_equal(${compactField}, ${whole}, ${maxEdits})
              ELSE 256
            END <= ${maxEdits}`;
            });
            return {
              exact: exactBranches.join('\nUNION\n'),
              fuzzy: fuzzyBranches.join('\nUNION\n'),
            };
          })()
        : undefined;

    for (let index = 0; index < searchTerms.length; index += 1) {
      const term = searchTerms[index];
      const spellings = searchSpellings(term);
      const tsQueries = exactSearchSpellings(term).map((spelling) => {
        const escaped = spelling.replace(/\\/gu, '\\\\').replace(/'/gu, "''");
        return [bind(`'${escaped}':*`)];
      });
      const compactTerm = compactSearchText(term);
      const useCompactCandidates = [...compactTerm].length >= 3;
      const fuzzyTerms =
        [...compactTerm].length >= 4
          ? spellings.map((spelling) => bind(compactSearchText(spelling)))
          : [];
      const compactExact = useCompactCandidates ? bind(compactTerm) : undefined;
      const sequencePattern = useCompactCandidates
        ? bind(toBoundarySequencePattern(compactTerm))
        : undefined;
      const alias = `term_${index}`;
      const branches = [
        { table: `${tables.tobacco} t`, field: 't.name' },
        {
          table: `${tables.brand} b JOIN ${tables.tobacco} t ON t."brandId" = b.id`,
          field: 'b.name',
        },
        {
          table: `${tables.line} l JOIN ${tables.tobacco} t ON t."lineId" = l.id`,
          field: 'l.name',
        },
      ];
      const fieldBranches = branches.map(({ table, field }) => {
        const compactField = SEARCH_COMPACT(field);
        const normalizedField = SEARCH_NORMALIZED(field);
        const compactSequenceMatch = useCompactCandidates
          ? `(
              ${compactField} LIKE '%' || ${compactExact} || '%'
              AND ${normalizedField} ~* ${sequencePattern}
            )`
          : 'FALSE';
        const fts = tsQueries
          .map((lexemeParams) => {
            const configMatches = ['simple', 'russian', 'english'].map(
              (config) =>
                lexemeParams
                  .map(
                    (param) =>
                      `to_tsvector('${config}', ${field}) @@ to_tsquery('${config}', ${param})`,
                  )
                  .join(' AND '),
            );
            const compactPrefix = useCompactCandidates
              ? `${compactField} LIKE ${compactExact} || '%'`
              : 'FALSE';
            return `(${[...configMatches, compactPrefix, compactSequenceMatch].join(' OR ')})`;
          })
          .join(' OR ');
        const relevance = tsQueries
          .flatMap((lexemeParams) =>
            ['simple', 'russian', 'english'].flatMap((config) =>
              lexemeParams.map(
                (param) =>
                  `ts_rank(to_tsvector('${config}', ${field}), to_tsquery('${config}', ${param}))`,
              ),
            ),
          )
          .join(' + ');
        const sequenceRelevance = `CASE WHEN ${compactSequenceMatch} THEN 1.0 ELSE 0.0 END`;
        const fuzzy = fuzzyTerms.length
          ? fuzzyTerms
              .map((param) => {
                const maxEdits = `CASE WHEN length(${param}) <= 5 THEN 1 ELSE 2 END`;
                const closeWord = `EXISTS (
              SELECT 1 FROM regexp_split_to_table(replace(lower(normalize(${field}, NFKC)), 'ё', 'е'), '[^[:alnum:]]+') AS candidate_word(word)
              WHERE CASE
                WHEN char_length(candidate_word.word) <= 255 AND char_length(${param}) <= 255
                THEN levenshtein_less_equal(lower(candidate_word.word), ${param}, ${maxEdits})
                ELSE 256
              END <= ${maxEdits}
            )`;
                const closeCompactName = `CASE
              WHEN char_length(${compactField}) <= 255 AND char_length(${param}) <= 255
              THEN levenshtein_less_equal(${compactField}, ${param}, ${maxEdits})
              ELSE 256
            END <= ${maxEdits}`;
                const fuzzyWord = `(${normalizedField} %> ${param}
              AND word_similarity(${param}, ${normalizedField}) >= 0.42
              AND ${closeWord})`;
                const fuzzyCompactName = `(length(${param}) >= 8
              AND ${compactField} % ${param}
              AND similarity(${compactField}, ${param}) >= 0.15
              AND ${closeCompactName})`;
                return `(length(${param}) >= 4 AND (${fuzzyWord} OR ${fuzzyCompactName}))`;
              })
              .join(' OR ')
          : 'FALSE';
        return `SELECT t.id, BOOL_OR(${fts}) AS exact, COALESCE(MAX(${relevance} + ${sequenceRelevance}), 0) AS relevance
          FROM ${table}
          WHERE (${fts}) OR (${fuzzy})
          GROUP BY t.id`;
      });
      const ignoredTermBranch =
        hasNonStopwordTerm && isStopword(term)
          ? `UNION ALL SELECT id, FALSE AS exact FROM ${tables.tobacco}`
          : '';
      termCtes.push(`${alias} AS (
        SELECT id, BOOL_OR(exact) AS exact, MAX(relevance) AS relevance FROM (
          ${fieldBranches.join('\nUNION ALL\n')}
          ${ignoredTermBranch ? `UNION ALL SELECT id, FALSE AS exact, 0::real AS relevance FROM ${tables.tobacco}` : ''}
        ) matched_fields GROUP BY id
      )`);
    }

    const countParameters = [...parameters];
    const wholePhraseParameter = searchTerms.length ? bind(compactWhole) : '';
    let candidateCte = '';
    if (searchTerms.length) {
      const termsIntersected = searchTerms.map(
        (_, index) => `term_${index} t${index}`,
      );
      const exactCount = searchTerms
        .map((_, index) => `CASE WHEN t${index}.exact THEN 1 ELSE 0 END`)
        .join(' + ');
      const relevanceTotal = searchTerms
        .map((_, index) => `COALESCE(t${index}.relevance, 0)`)
        .join(' + ');
      const from = termsIntersected.join('\nJOIN ');
      const joinedExact = wholeQueryMatches
        ? `UNION ALL SELECT id, ${searchTerms.length} AS exact_count, ${searchTerms.length}::real AS relevance FROM (${wholeQueryMatches.exact}) joined_exact`
        : '';
      const joinedFuzzy = wholeQueryMatches
        ? `UNION ALL SELECT id, GREATEST(${searchTerms.length} - 1, 0) AS exact_count, 0::real AS relevance FROM (${wholeQueryMatches.fuzzy}) joined_fuzzy`
        : '';
      candidateCte = `WITH ${termCtes.join(',\n')}, strict_or_fuzzy AS (
        SELECT t0.id, (${exactCount}) AS exact_count, (${relevanceTotal}) AS relevance FROM ${from.replace(/\nJOIN term_(\d+) t(\d+)/gu, '\nJOIN term_$1 t$2 ON t$2.id = t0.id')}
        ${joinedExact}
        ${joinedFuzzy}
      ), matched AS (
        SELECT id, MAX(exact_count) AS exact_count, MAX(relevance) AS relevance
        FROM strict_or_fuzzy GROUP BY id
      )`;
    }

    const filterClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const wholeQueryPrefix = `${wholePhraseParameter} || '%'`;
    const phraseMatch = `CASE WHEN
      ${SEARCH_COMPACT('t.name')} = ${wholePhraseParameter}
      OR ${SEARCH_COMPACT('b.name')} = ${wholePhraseParameter}
      OR ${SEARCH_COMPACT('l.name')} = ${wholePhraseParameter}
      OR ${SEARCH_COMPACT("concat_ws(' ', b.name, t.name)")} = ${wholePhraseParameter}
      OR ${SEARCH_COMPACT("concat_ws(' ', b.name, l.name, t.name)")} = ${wholePhraseParameter}
      OR ${SEARCH_COMPACT("concat_ws(' ', l.name, t.name)")} = ${wholePhraseParameter}
      THEN 1 ELSE 0 END`;
    const phrasePrefix = `CASE WHEN
      ${SEARCH_COMPACT('t.name')} LIKE ${wholeQueryPrefix}
      OR ${SEARCH_COMPACT('b.name')} LIKE ${wholeQueryPrefix}
      OR ${SEARCH_COMPACT('l.name')} LIKE ${wholeQueryPrefix}
      THEN 1 ELSE 0 END`;
    const ordering = searchTerms.length
      ? `matched.exact_count DESC,
         ${phraseMatch} DESC,
         ${phrasePrefix} DESC,
         matched.relevance DESC,
         ${sortField} ${sortOrder}, t."ratingsCount" DESC, t.id ASC`
      : `${sortField} ${sortOrder}, t."ratingsCount" DESC, t.id ASC`;
    const countSql = `${candidateCte}
      SELECT COUNT(*)::int AS total
      FROM ${tables.tobacco} t ${country ? `JOIN ${tables.brand} filter_brand ON filter_brand.id = t."brandId"` : ''}
      ${searchTerms.length ? 'JOIN matched ON matched.id = t.id' : ''}
      ${filterClause}`;
    const pageSql = `${candidateCte}
      SELECT t.id${searchTerms.length ? ', matched.exact_count' : ''}
      FROM ${tables.tobacco} t ${country ? `JOIN ${tables.brand} filter_brand ON filter_brand.id = t."brandId"` : ''}
      ${searchTerms.length ? `LEFT JOIN ${tables.brand} b ON b.id = t."brandId" LEFT JOIN ${tables.line} l ON l.id = t."lineId"` : ''}
      ${searchTerms.length ? 'JOIN matched ON matched.id = t.id' : ''}
      ${filterClause}
      ORDER BY ${ordering}
      OFFSET ${bind(skip)} LIMIT ${bind(limit)}`;

    const result = await this.tobaccoRepository.manager.transaction(
      'REPEATABLE READ',
      async (manager) => {
        await manager.query('SET TRANSACTION READ ONLY');
        if (searchTerms.length) {
          await manager.query(
            "SET LOCAL pg_trgm.word_similarity_threshold = '0.42'",
          );
          await manager.query(
            "SET LOCAL pg_trgm.similarity_threshold = '0.15'",
          );
        }
        const countRowsResult: unknown = await manager.query(
          countSql,
          countParameters,
        );
        const pageRowsResult: unknown = await manager.query(
          pageSql,
          parameters,
        );
        const countRows = queryRows<{ total: number }>(countRowsResult);
        const pageRows = queryRows<{ id: string; exact_count?: number }>(
          pageRowsResult,
        );
        const rows = pageRows;
        const ids = rows.map((row) => row.id);
        const records = ids.length
          ? await manager.getRepository(Tobacco).find({
              where: { id: In(ids) },
              relations: { brand: true, line: true, flavors: true },
            })
          : [];
        const byId = new Map(records.map((record) => [record.id, record]));
        return {
          total: Number(countRows[0]?.total ?? 0),
          rows,
          data: ids.flatMap((id) => {
            const record = byId.get(id);
            return record ? [record] : [];
          }),
        };
      },
    );
    const approximateResultIds = result.rows
      .filter(
        (row) =>
          row.exact_count !== undefined && row.exact_count < searchTerms.length,
      )
      .map((row) => row.id);

    return {
      data: result.data,
      total: result.total,
      ...(approximateResultIds.length
        ? {
            search: {
              matchQuality: 'approximate',
              approximateResultIds,
            } as SearchResultMetadata,
          }
        : {}),
    };
  }

  async findOne(id: string): Promise<Tobacco | null> {
    return this.tobaccoRepository.findOne({
      where: { id },
      relations: ['brand', 'line', 'flavors'],
    });
  }

  async findBySlug(slug: string): Promise<Tobacco | null> {
    return this.tobaccoRepository.findOne({
      where: { slug },
      relations: ['brand', 'line', 'flavors'],
    });
  }

  async findBySlugs(
    brandSlug: string,
    lineSlug: string,
    tobaccoSlug: string,
  ): Promise<Tobacco | null> {
    const queryBuilder = this.tobaccoRepository.createQueryBuilder('tobacco');

    queryBuilder
      .leftJoinAndSelect('tobacco.brand', 'brand')
      .leftJoinAndSelect('tobacco.line', 'line')
      .leftJoinAndSelect('tobacco.flavors', 'flavor')
      .where('brand.slug = :brandSlug', { brandSlug })
      .andWhere('line.slug = :lineSlug', { lineSlug })
      .andWhere('tobacco.slug = :tobaccoSlug', { tobaccoSlug });

    return queryBuilder.getOne();
  }

  async getStatuses(): Promise<string[]> {
    const result = await this.tobaccoRepository
      .createQueryBuilder('tobacco')
      .select('DISTINCT tobacco.status')
      .where('tobacco.status IS NOT NULL')
      .orderBy('tobacco.status', 'ASC')
      .getRawMany();

    return result.map((row: { status: string }) => row.status);
  }
}
