import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddSlugToTobacco1706328000008 implements MigrationInterface {
  name = 'AddSlugToTobacco1706328000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tobaccos"
      ADD COLUMN "slug" varchar(255)
    `);

    // Create index on slug for faster lookups
    await queryRunner.createIndex(
      'tobaccos',
      new TableIndex({
        name: 'idx_tobaccos_slug',
        columnNames: ['slug'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('tobaccos', 'idx_tobaccos_slug');
    await queryRunner.query(`
      ALTER TABLE "tobaccos"
      DROP COLUMN "slug"
    `);
  }
}
