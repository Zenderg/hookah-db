import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class MakeBrandAndLineFieldsRequired1706328000007 implements MigrationInterface {
  name = 'MakeBrandAndLineFieldsRequired1706328000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update brands table: make logoUrl required
    await queryRunner.query(`
      UPDATE brands SET logoUrl = '' WHERE logoUrl IS NULL
    `);

    // SQLite requires recreating table to add NOT NULL constraint
    await queryRunner.dropTable('brands');
    await queryRunner.createTable(
      new Table({
        name: 'brands',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'country',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
            isNullable: true,
          },
          {
            name: 'ratingsCount',
            type: 'integer',
            default: 0,
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'logoUrl',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            isNullable: true,
          },
        ],
        indices: [
          {
            name: 'idx_brands_slug',
            columnNames: ['slug'],
          },
        ],
      }),
    );

    // Update lines table: add slug column and make fields required
    // Set default values for nullable columns before recreating table
    await queryRunner.query(`
      UPDATE lines
      SET
        brandId = COALESCE(brandId, ''),
        imageUrl = COALESCE(imageUrl, ''),
        strengthOfficial = COALESCE(strengthOfficial, ''),
        strengthByRatings = COALESCE(strengthByRatings, ''),
        status = COALESCE(status, ''),
        rating = COALESCE(rating, 0),
        ratingsCount = COALESCE(ratingsCount, 0)
    `);

    // Recreate lines table with new schema
    await queryRunner.dropTable('lines');
    await queryRunner.createTable(
      new Table({
        name: 'lines',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'slug',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'brandId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'imageUrl',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'ratingsCount',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'strengthOfficial',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'strengthByRatings',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            isNullable: true,
          },
        ],
        indices: [
          {
            name: 'idx_lines_slug',
            columnNames: ['slug'],
          },
          {
            name: 'idx_lines_rating',
            columnNames: ['rating'],
          },
          {
            name: 'idx_lines_status',
            columnNames: ['status'],
          },
          {
            name: 'idx_lines_strength',
            columnNames: ['strengthOfficial'],
          },
        ],
        foreignKeys: [
          {
            name: 'fk_lines_brand',
            columnNames: ['brandId'],
            referencedTableName: 'brands',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert brands table - make logoUrl nullable again
    await queryRunner.dropTable('brands');
    await queryRunner.createTable(
      new Table({
        name: 'brands',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'country',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
            isNullable: true,
          },
          {
            name: 'ratingsCount',
            type: 'integer',
            default: 0,
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'logoUrl',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            isNullable: true,
          },
        ],
        indices: [
          {
            name: 'idx_brands_slug',
            columnNames: ['slug'],
          },
        ],
      }),
    );

    // Revert lines table - remove slug and make fields nullable
    await queryRunner.dropTable('lines');
    await queryRunner.createTable(
      new Table({
        name: 'lines',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'brandId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'imageUrl',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
            isNullable: true,
          },
          {
            name: 'ratingsCount',
            type: 'integer',
            default: 0,
            isNullable: true,
          },
          {
            name: 'strengthOfficial',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'strengthByRatings',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            isNullable: true,
          },
        ],
        indices: [
          {
            name: 'idx_lines_rating',
            columnNames: ['rating'],
          },
          {
            name: 'idx_lines_status',
            columnNames: ['status'],
          },
          {
            name: 'idx_lines_strength',
            columnNames: ['strengthOfficial'],
          },
        ],
        foreignKeys: [
          {
            name: 'fk_lines_brand',
            columnNames: ['brandId'],
            referencedTableName: 'brands',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );
  }
}
