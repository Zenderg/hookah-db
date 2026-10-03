import { MigrationInterface, QueryRunner } from 'typeorm';

async function currentSchema(queryRunner: QueryRunner): Promise<string> {
  const result: unknown = await queryRunner.query(
    'SELECT current_schema() AS schema',
  );
  if (!Array.isArray(result) || result.length !== 1) {
    throw new Error('Cannot resolve the current PostgreSQL schema');
  }
  const row = result[0] as { schema?: unknown };
  if (typeof row.schema !== 'string') {
    throw new Error('Cannot resolve the current PostgreSQL schema');
  }
  return row.schema;
}

export class AddCrossAlphabetCatalogSearch1791027000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = queryRunner.connection.driver.escape(
      await currentSchema(queryRunner),
    );
    const functionName = (name: string) => `${schema}.${name}`;
    await queryRunner.query(`
      CREATE FUNCTION ${functionName('catalog_search_latin')}(input text)
      RETURNS text
      LANGUAGE SQL
      IMMUTABLE PARALLEL SAFE
      RETURNS NULL ON NULL INPUT
      AS $$
        SELECT replace(replace(replace(replace(replace(replace(replace(replace(replace(
          translate(
            replace(lower(normalize(input, NFKC)), 'ё', 'е'),
            'абвгдезийклмнопрстуфхыэ',
            'abvgdeziyklmnoprstufhye'
          ),
          'ж', 'zh'), 'ц', 'ts'), 'ч', 'ch'), 'ш', 'sh'),
          'щ', 'sch'), 'ъ', ''), 'ь', ''), 'ю', 'yu'), 'я', 'ya')
      $$
    `);
    await queryRunner.query(`
      CREATE FUNCTION ${functionName('catalog_search_visual')}(input text)
      RETURNS text
      LANGUAGE SQL
      IMMUTABLE PARALLEL SAFE
      RETURNS NULL ON NULL INPUT
      AS $$
        WITH normalized AS (
          SELECT replace(lower(normalize(input, NFKC)), 'ё', 'е') AS value
        ), pieces AS (
          SELECT match[1] AS piece, ordinal
          FROM regexp_matches(
            (SELECT value FROM normalized),
            '[[:alnum:]]+|[^[:alnum:]]+', 'g'
          ) WITH ORDINALITY AS matches(match, ordinal)
        )
        SELECT CASE
          WHEN NOT ((SELECT value FROM normalized) ~ '[a-z]'
            AND (SELECT value FROM normalized) ~ '[а-я]')
          THEN (SELECT value FROM normalized)
          ELSE COALESCE((
            SELECT string_agg(
              CASE
                WHEN piece ~ '[a-z]' AND piece ~ '[а-я]' AND
                  char_length(regexp_replace(piece, '[^a-z]', '', 'g')) >
                  char_length(regexp_replace(piece, '[^а-я]', '', 'g'))
                THEN translate(piece, 'авекмнорстух', 'abekmhopctyx')
                WHEN piece ~ '[a-z]' AND piece ~ '[а-я]'
                THEN translate(piece, 'abcehkmoprtxy', 'авсенкморртху')
                ELSE piece
              END,
              '' ORDER BY ordinal
            )
            FROM pieces
          ), '')
        END
      $$
    `);
    await queryRunner.query(`
      CREATE FUNCTION ${functionName('catalog_search_has_mixed_token')}(input text)
      RETURNS boolean
      LANGUAGE SQL
      IMMUTABLE PARALLEL SAFE
      RETURNS NULL ON NULL INPUT
      AS $$
        SELECT replace(lower(normalize(input, NFKC)), 'ё', 'е') ~
          '(^|[^[:alnum:]])[[:alnum:]]*([a-z][[:alnum:]]*[а-я]|[а-я][[:alnum:]]*[a-z])[[:alnum:]]*([^[:alnum:]]|$)'
      $$
    `);
    await queryRunner.query(`
      CREATE FUNCTION ${functionName('catalog_search_compact')}(input text)
      RETURNS text
      LANGUAGE SQL
      IMMUTABLE PARALLEL SAFE
      RETURNS NULL ON NULL INPUT
      AS $$
        SELECT regexp_replace(${functionName('catalog_search_latin')}(input), '[^[:alnum:]]+', '', 'g')
      $$
    `);
    await queryRunner.query(`
      CREATE FUNCTION ${functionName('catalog_search_compact_visual')}(input text)
      RETURNS text
      LANGUAGE SQL
      IMMUTABLE PARALLEL SAFE
      RETURNS NULL ON NULL INPUT
      AS $$
        SELECT regexp_replace(${functionName('catalog_search_latin')}(${functionName('catalog_search_visual')}(input)), '[^[:alnum:]]+', '', 'g')
      $$
    `);
    await queryRunner.query(`
      CREATE FUNCTION ${functionName('catalog_search_words')}(input text)
      RETURNS text
      LANGUAGE SQL
      IMMUTABLE PARALLEL SAFE
      RETURNS NULL ON NULL INPUT
      AS $$
        SELECT regexp_replace(${functionName('catalog_search_latin')}(input), '[^[:alnum:]]+', ' ', 'g')
      $$
    `);
    await queryRunner.query(`
      CREATE FUNCTION ${functionName('catalog_search_words_visual')}(input text)
      RETURNS text
      LANGUAGE SQL
      IMMUTABLE PARALLEL SAFE
      RETURNS NULL ON NULL INPUT
      AS $$
        SELECT regexp_replace(${functionName('catalog_search_latin')}(${functionName('catalog_search_visual')}(input)), '[^[:alnum:]]+', ' ', 'g')
      $$
    `);

    for (const table of ['tobaccos', 'brands', 'lines']) {
      for (const field of ['name', 'slug']) {
        await queryRunner.query(`
          CREATE INDEX idx_${table}_${field}_cross_alpha_trgm
          ON ${table} USING GIN (${functionName('catalog_search_compact')}("${field}") gin_trgm_ops)
        `);
        if (field === 'name') {
          await queryRunner.query(`
        CREATE INDEX idx_${table}_name_cross_alpha_words_trgm
        ON ${table} USING GIN (${functionName('catalog_search_words')}("name") gin_trgm_ops)
      `);
          await queryRunner.query(`
        CREATE INDEX idx_${table}_name_fulltext_nfkc
        ON ${table} USING GIN (to_tsvector('simple', normalize("name", NFKC)))
      `);
        }
      }
      await queryRunner.query(`
        CREATE INDEX idx_${table}_name_visual_words_trgm
        ON ${table} USING GIN (${functionName('catalog_search_words_visual')}("name") gin_trgm_ops)
      `);
      await queryRunner.query(`
        CREATE INDEX idx_${table}_name_visual_compact_trgm
        ON ${table} USING GIN (${functionName('catalog_search_compact_visual')}("name") gin_trgm_ops)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = queryRunner.connection.driver.escape(
      await currentSchema(queryRunner),
    );
    const functionName = (name: string) => `${schema}.${name}`;
    for (const table of ['tobaccos', 'brands', 'lines']) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS idx_${table}_name_visual_words_trgm`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS idx_${table}_name_visual_compact_trgm`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS idx_${table}_name_cross_alpha_words_trgm`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS idx_${table}_name_fulltext_nfkc`,
      );
      for (const field of ['name', 'slug']) {
        await queryRunner.query(
          `DROP INDEX IF EXISTS idx_${table}_${field}_cross_alpha_trgm`,
        );
      }
    }
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS ${functionName('catalog_search_words_visual')}(text)`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS ${functionName('catalog_search_words')}(text)`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS ${functionName('catalog_search_compact_visual')}(text)`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS ${functionName('catalog_search_compact')}(text)`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS ${functionName('catalog_search_visual')}(text)`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS ${functionName('catalog_search_latin')}(text)`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS ${functionName('catalog_search_has_mixed_token')}(text)`,
    );
  }
}
