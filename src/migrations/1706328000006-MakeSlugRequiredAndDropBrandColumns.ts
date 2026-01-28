import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class MakeSlugRequiredAndDropBrandColumns1706328000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, ensure all brands have a slug (set to empty string if null)
    await queryRunner.query(`
      UPDATE brands
      SET slug = COALESCE(slug, '')
      WHERE slug IS NULL
    `);

    // Then make slug column non-nullable
    await queryRunner.changeColumn(
      'brands',
      'slug',
      new TableColumn({
        name: 'slug',
        type: 'varchar',
        isNullable: false,
      }),
    );

    // Drop reviewsCount column
    await queryRunner.dropColumn('brands', 'reviewsCount');

    // Drop views column
    await queryRunner.dropColumn('brands', 'views');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add reviewsCount column
    await queryRunner.addColumn(
      'brands',
      new TableColumn({
        name: 'reviewsCount',
        type: 'int',
        default: 0,
      }),
    );

    // Re-add views column
    await queryRunner.addColumn(
      'brands',
      new TableColumn({
        name: 'views',
        type: 'int',
        default: 0,
      }),
    );

    // Make slug column nullable again
    await queryRunner.changeColumn(
      'brands',
      'slug',
      new TableColumn({
        name: 'slug',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }
}
