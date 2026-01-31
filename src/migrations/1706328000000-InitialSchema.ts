import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class InitialSchema1706328000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create brands table
    await queryRunner.createTable(
      new Table({
        name: 'brands',
        columns: [
          {
            name: 'id',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'slug',
            type: 'varchar',
          },
          {
            name: 'country',
            type: 'varchar',
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'ratingsCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'logoUrl',
            type: 'varchar',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
          },
        ],
      }),
      true,
    );

    // Create indexes for brands
    await queryRunner.createIndex(
      'brands',
      new TableIndex({
        name: 'idx_brands_slug',
        columnNames: ['slug'],
      }),
    );

    await queryRunner.createIndex(
      'brands',
      new TableIndex({
        name: 'idx_brands_rating',
        columnNames: ['rating'],
      }),
    );

    // Create lines table
    await queryRunner.createTable(
      new Table({
        name: 'lines',
        columns: [
          {
            name: 'id',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'slug',
            type: 'varchar',
          },
          {
            name: 'brandId',
            type: 'text',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'imageUrl',
            type: 'varchar',
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'ratingsCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'strengthOfficial',
            type: 'varchar',
          },
          {
            name: 'strengthByRatings',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'varchar',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
          },
        ],
      }),
      true,
    );

    // Create indexes for lines
    await queryRunner.createIndex(
      'lines',
      new TableIndex({
        name: 'idx_lines_slug',
        columnNames: ['slug'],
      }),
    );

    await queryRunner.createIndex(
      'lines',
      new TableIndex({
        name: 'idx_lines_rating',
        columnNames: ['rating'],
      }),
    );

    await queryRunner.createIndex(
      'lines',
      new TableIndex({
        name: 'idx_lines_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'lines',
      new TableIndex({
        name: 'idx_lines_strength',
        columnNames: ['strengthOfficial'],
      }),
    );

    await queryRunner.createIndex(
      'lines',
      new TableIndex({
        name: 'idx_lines_brandId',
        columnNames: ['brandId'],
      }),
    );

    // Create foreign key for lines.brandId
    await queryRunner.createForeignKey(
      'lines',
      new TableForeignKey({
        columnNames: ['brandId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'brands',
        onDelete: 'CASCADE',
        name: 'fk_lines_brand',
      }),
    );

    // Create tobaccos table
    await queryRunner.createTable(
      new Table({
        name: 'tobaccos',
        columns: [
          {
            name: 'id',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'slug',
            type: 'varchar',
          },
          {
            name: 'brandId',
            type: 'text',
          },
          {
            name: 'lineId',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'ratingsCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'country',
            type: 'varchar',
          },
          {
            name: 'strengthOfficial',
            type: 'varchar',
          },
          {
            name: 'strengthByRatings',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'varchar',
          },
          {
            name: 'htreviewsId',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'imageUrl',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
          },
        ],
      }),
      true,
    );

    // Create indexes for tobaccos
    await queryRunner.createIndex(
      'tobaccos',
      new TableIndex({
        name: 'idx_tobaccos_brandId',
        columnNames: ['brandId'],
      }),
    );

    await queryRunner.createIndex(
      'tobaccos',
      new TableIndex({
        name: 'idx_tobaccos_lineId',
        columnNames: ['lineId'],
      }),
    );

    await queryRunner.createIndex(
      'tobaccos',
      new TableIndex({
        name: 'idx_tobaccos_rating',
        columnNames: ['rating'],
      }),
    );

    await queryRunner.createIndex(
      'tobaccos',
      new TableIndex({
        name: 'idx_tobaccos_country',
        columnNames: ['country'],
      }),
    );

    // Create foreign keys for tobaccos
    await queryRunner.createForeignKey(
      'tobaccos',
      new TableForeignKey({
        columnNames: ['brandId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'brands',
        onDelete: 'CASCADE',
        name: 'fk_tobaccos_brand',
      }),
    );

    await queryRunner.createForeignKey(
      'tobaccos',
      new TableForeignKey({
        columnNames: ['lineId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lines',
        onDelete: 'SET NULL',
        name: 'fk_tobaccos_line',
      }),
    );

    // Create api_keys table
    await queryRunner.createTable(
      new Table({
        name: 'api_keys',
        columns: [
          {
            name: 'id',
            type: 'text',
            isPrimary: true,
          },
          {
            name: 'key',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'requestCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'lastUsedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.dropForeignKey('tobaccos', 'fk_tobaccos_line');
    await queryRunner.dropForeignKey('tobaccos', 'fk_tobaccos_brand');
    await queryRunner.dropForeignKey('lines', 'fk_lines_brand');

    // Drop indexes
    await queryRunner.dropIndex('tobaccos', 'idx_tobaccos_country');
    await queryRunner.dropIndex('tobaccos', 'idx_tobaccos_rating');
    await queryRunner.dropIndex('tobaccos', 'idx_tobaccos_lineId');
    await queryRunner.dropIndex('tobaccos', 'idx_tobaccos_brandId');

    await queryRunner.dropIndex('lines', 'idx_lines_brandId');
    await queryRunner.dropIndex('lines', 'idx_lines_strength');
    await queryRunner.dropIndex('lines', 'idx_lines_status');
    await queryRunner.dropIndex('lines', 'idx_lines_rating');
    await queryRunner.dropIndex('lines', 'idx_lines_slug');

    await queryRunner.dropIndex('brands', 'idx_brands_rating');
    await queryRunner.dropIndex('brands', 'idx_brands_slug');

    // Drop tables
    await queryRunner.dropTable('api_keys');
    await queryRunner.dropTable('tobaccos');
    await queryRunner.dropTable('lines');
    await queryRunner.dropTable('brands');
  }
}
