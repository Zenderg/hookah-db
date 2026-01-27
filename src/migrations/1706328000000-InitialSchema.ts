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
            name: 'reviewsCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'views',
            type: 'integer',
            default: 0,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
          },
        ],
      }),
      true,
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
            name: 'brandId',
            type: 'text',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
          },
        ],
      }),
      true,
    );

    // Create foreign key for lines.brandId
    await queryRunner.createForeignKey(
      'lines',
      new TableForeignKey({
        columnNames: ['brandId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'brands',
        onDelete: 'CASCADE',
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
            name: 'nameRu',
            type: 'varchar',
          },
          {
            name: 'nameEn',
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
            name: 'reviewsCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'views',
            type: 'integer',
            default: 0,
          },
          {
            name: 'category',
            type: 'varchar',
          },
          {
            name: 'year',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
          },
          {
            name: 'strengthOfficial',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'strengthUser',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'tier',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'flavorDescriptors',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'productionStatus',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'htreviewsId',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'dateAdded',
            type: 'datetime',
          },
          {
            name: 'createdAt',
            type: 'datetime',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
          },
        ],
      }),
      true,
    );

    // Create foreign key for tobaccos.brandId
    await queryRunner.createForeignKey(
      'tobaccos',
      new TableForeignKey({
        columnNames: ['brandId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'brands',
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key for tobaccos.lineId
    await queryRunner.createForeignKey(
      'tobaccos',
      new TableForeignKey({
        columnNames: ['lineId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'lines',
        onDelete: 'SET NULL',
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
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
          },
        ],
      }),
      true,
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'brands',
      new TableIndex({
        name: 'IDX_BRANDS_RATING',
        columnNames: ['rating'],
      }),
    );

    await queryRunner.createIndex(
      'brands',
      new TableIndex({
        name: 'IDX_BRANDS_VIEWS',
        columnNames: ['views'],
      }),
    );

    await queryRunner.createIndex(
      'tobaccos',
      new TableIndex({
        name: 'IDX_TOBACCOS_BRAND_ID',
        columnNames: ['brandId'],
      }),
    );

    await queryRunner.createIndex(
      'tobaccos',
      new TableIndex({
        name: 'IDX_TOBACCOS_LINE_ID',
        columnNames: ['lineId'],
      }),
    );

    await queryRunner.createIndex(
      'tobaccos',
      new TableIndex({
        name: 'IDX_TOBACCOS_RATING',
        columnNames: ['rating'],
      }),
    );

    await queryRunner.createIndex(
      'tobaccos',
      new TableIndex({
        name: 'IDX_TOBACCOS_VIEWS',
        columnNames: ['views'],
      }),
    );

    await queryRunner.createIndex(
      'tobaccos',
      new TableIndex({
        name: 'IDX_TOBACCOS_DATE_ADDED',
        columnNames: ['dateAdded'],
      }),
    );

    await queryRunner.createIndex(
      'tobaccos',
      new TableIndex({
        name: 'IDX_TOBACCOS_CATEGORY',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'tobaccos',
      new TableIndex({
        name: 'IDX_TOBACCOS_COUNTRY',
        columnNames: ['country'],
      }),
    );

    await queryRunner.createIndex(
      'tobaccos',
      new TableIndex({
        name: 'IDX_TOBACCOS_PRODUCTION_STATUS',
        columnNames: ['productionStatus'],
      }),
    );

    await queryRunner.createIndex(
      'lines',
      new TableIndex({
        name: 'IDX_LINES_BRAND_ID',
        columnNames: ['brandId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('lines', 'IDX_LINES_BRAND_ID');
    await queryRunner.dropIndex('tobaccos', 'IDX_TOBACCOS_PRODUCTION_STATUS');
    await queryRunner.dropIndex('tobaccos', 'IDX_TOBACCOS_COUNTRY');
    await queryRunner.dropIndex('tobaccos', 'IDX_TOBACCOS_CATEGORY');
    await queryRunner.dropIndex('tobaccos', 'IDX_TOBACCOS_DATE_ADDED');
    await queryRunner.dropIndex('tobaccos', 'IDX_TOBACCOS_VIEWS');
    await queryRunner.dropIndex('tobaccos', 'IDX_TOBACCOS_RATING');
    await queryRunner.dropIndex('tobaccos', 'IDX_TOBACCOS_LINE_ID');
    await queryRunner.dropIndex('tobaccos', 'IDX_TOBACCOS_BRAND_ID');
    await queryRunner.dropIndex('brands', 'IDX_BRANDS_VIEWS');
    await queryRunner.dropIndex('brands', 'IDX_BRANDS_RATING');

    // Drop tables in reverse order of creation (to handle foreign keys)
    await queryRunner.dropTable('api_keys');
    await queryRunner.dropTable('tobaccos');
    await queryRunner.dropTable('lines');
    await queryRunner.dropTable('brands');
  }
}
