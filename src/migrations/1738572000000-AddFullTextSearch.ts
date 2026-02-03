import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFullTextSearch1738572000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add GIN indexes for full-text search with simple configuration (supports all languages)

    // Create GIN index for tobacco.name
    await queryRunner.query(`
      CREATE INDEX idx_tobaccos_name_fulltext
      ON tobaccos
      USING GIN (to_tsvector('simple', "name"))
    `);

    // Create GIN index for brand.name
    await queryRunner.query(`
      CREATE INDEX idx_brands_name_fulltext
      ON brands
      USING GIN (to_tsvector('simple', "name"))
    `);

    // Create GIN index for line.name
    await queryRunner.query(`
      CREATE INDEX idx_lines_name_fulltext
      ON lines
      USING GIN (to_tsvector('simple', "name"))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop full-text search indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tobaccos_name_fulltext`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_brands_name_fulltext`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_lines_name_fulltext`);
  }
}
