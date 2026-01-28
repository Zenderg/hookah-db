import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddSlugToBrand1706328000005 implements MigrationInterface {
  name = 'AddSlugToBrand1706328000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "brands"
      ADD COLUMN "slug" varchar(255)
    `);

    // Create index on slug for faster lookups
    await queryRunner.createIndex(
      'brands',
      new TableIndex({
        name: 'idx_brands_slug',
        columnNames: ['slug'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('brands', 'idx_brands_slug');
    await queryRunner.query(`
      ALTER TABLE "brands"
      DROP COLUMN "slug"
    `);
  }
}
