import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeCatalogSearch1791026400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS fuzzystrmatch');

    for (const table of ['tobaccos', 'brands', 'lines']) {
      const indexPrefix = table;
      await queryRunner.query(`
        CREATE INDEX idx_${indexPrefix}_name_fulltext_simple
        ON ${table} USING GIN (to_tsvector('simple', "name"))
      `);
      await queryRunner.query(`
        CREATE INDEX idx_${indexPrefix}_name_compact_trgm
        ON ${table} USING GIN (
          (regexp_replace(replace(lower(normalize("name", NFKC)), 'ё', 'е'), '[^[:alnum:]]+', '', 'g')) gin_trgm_ops
        )
      `);
      await queryRunner.query(`
        CREATE INDEX idx_${indexPrefix}_name_normalized_trgm
        ON ${table} USING GIN (
          (regexp_replace(replace(lower(normalize("name", NFKC)), 'ё', 'е'), '[^[:alnum:]]+', ' ', 'g')) gin_trgm_ops
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['tobaccos', 'brands', 'lines']) {
      const indexPrefix = table;
      await queryRunner.query(
        `DROP INDEX IF EXISTS idx_${indexPrefix}_name_normalized_trgm`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS idx_${indexPrefix}_name_compact_trgm`,
      );
      await queryRunner.query(
        `DROP INDEX IF EXISTS idx_${indexPrefix}_name_fulltext_simple`,
      );
    }
  }
}
