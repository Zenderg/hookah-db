import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiLanguageFullTextSearch1738606800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing simple configuration indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tobaccos_name_fulltext`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_brands_name_fulltext`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lines_name_fulltext`);

    // Create GIN indexes for full-text search with Russian configuration
    // Create GIN index for tobacco.name (Russian)
    await queryRunner.query(`
      CREATE INDEX idx_tobaccos_name_fulltext_ru
      ON tobaccos
      USING GIN (to_tsvector('russian', "name"))
    `);

    // Create GIN index for brand.name (Russian)
    await queryRunner.query(`
      CREATE INDEX idx_brands_name_fulltext_ru
      ON brands
      USING GIN (to_tsvector('russian', "name"))
    `);

    // Create GIN index for line.name (Russian)
    await queryRunner.query(`
      CREATE INDEX idx_lines_name_fulltext_ru
      ON lines
      USING GIN (to_tsvector('russian', "name"))
    `);

    // Create GIN indexes for full-text search with English configuration
    // Create GIN index for tobacco.name (English)
    await queryRunner.query(`
      CREATE INDEX idx_tobaccos_name_fulltext_en
      ON tobaccos
      USING GIN (to_tsvector('english', "name"))
    `);

    // Create GIN index for brand.name (English)
    await queryRunner.query(`
      CREATE INDEX idx_brands_name_fulltext_en
      ON brands
      USING GIN (to_tsvector('english', "name"))
    `);

    // Create GIN index for line.name (English)
    await queryRunner.query(`
      CREATE INDEX idx_lines_name_fulltext_en
      ON lines
      USING GIN (to_tsvector('english', "name"))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop Russian full-text search indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_tobaccos_name_fulltext_ru`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_brands_name_fulltext_ru`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lines_name_fulltext_ru`);

    // Drop English full-text search indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_tobaccos_name_fulltext_en`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_brands_name_fulltext_en`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lines_name_fulltext_en`);

    // Recreate simple configuration indexes (restore previous state)
    await queryRunner.query(`
      CREATE INDEX idx_tobaccos_name_fulltext
      ON tobaccos
      USING GIN (to_tsvector('simple', "name"))
    `);

    await queryRunner.query(`
      CREATE INDEX idx_brands_name_fulltext
      ON brands
      USING GIN (to_tsvector('simple', "name"))
    `);

    await queryRunner.query(`
      CREATE INDEX idx_lines_name_fulltext
      ON lines
      USING GIN (to_tsvector('simple', "name"))
    `);
  }
}
