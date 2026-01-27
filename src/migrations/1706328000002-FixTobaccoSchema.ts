import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class FixTobaccoSchema1706328000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes that reference columns being removed
    await queryRunner.dropIndex('tobaccos', 'IDX_TOBACCOS_VIEWS');
    await queryRunner.dropIndex('tobaccos', 'IDX_TOBACCOS_DATE_ADDED');
    await queryRunner.dropIndex('tobaccos', 'IDX_TOBACCOS_CATEGORY');
    await queryRunner.dropIndex('tobaccos', 'IDX_TOBACCOS_PRODUCTION_STATUS');

    // Drop columns that are no longer needed
    await queryRunner.dropColumn('tobaccos', 'nameRu');
    await queryRunner.dropColumn('tobaccos', 'nameEn');
    await queryRunner.dropColumn('tobaccos', 'reviewsCount');
    await queryRunner.dropColumn('tobaccos', 'views');
    await queryRunner.dropColumn('tobaccos', 'category');
    await queryRunner.dropColumn('tobaccos', 'flavorDescriptors');
    await queryRunner.dropColumn('tobaccos', 'dateAdded');
    await queryRunner.dropColumn('tobaccos', 'year');
    await queryRunner.dropColumn('tobaccos', 'tier');

    // Rename productionStatus to status
    await queryRunner.renameColumn('tobaccos', 'productionStatus', 'status');

    // Change strengthUser (strengthByRatings) from decimal to varchar
    await queryRunner.changeColumn(
      'tobaccos',
      'strengthUser',
      new TableColumn({
        name: 'strengthByRatings',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Add new columns
    await queryRunner.addColumn(
      'tobaccos',
      new TableColumn({
        name: 'imageUrl',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'tobaccos',
      new TableColumn({
        name: 'description',
        type: 'text',
        isNullable: true,
      }),
    );

    // Add name column (replacing nameRu and nameEn)
    await queryRunner.addColumn(
      'tobaccos',
      new TableColumn({
        name: 'name',
        type: 'varchar',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop name column
    await queryRunner.dropColumn('tobaccos', 'name');

    // Drop new columns
    await queryRunner.dropColumn('tobaccos', 'description');
    await queryRunner.dropColumn('tobaccos', 'imageUrl');

    // Revert strengthByRatings to strengthUser (decimal)
    await queryRunner.changeColumn(
      'tobaccos',
      'strengthByRatings',
      new TableColumn({
        name: 'strengthUser',
        type: 'decimal',
        precision: 3,
        scale: 2,
        isNullable: true,
      }),
    );

    // Rename status back to productionStatus
    await queryRunner.renameColumn('tobaccos', 'status', 'productionStatus');

    // Add back dropped columns
    await queryRunner.addColumn(
      'tobaccos',
      new TableColumn({
        name: 'nameRu',
        type: 'varchar',
      }),
    );

    await queryRunner.addColumn(
      'tobaccos',
      new TableColumn({
        name: 'nameEn',
        type: 'varchar',
      }),
    );

    await queryRunner.addColumn(
      'tobaccos',
      new TableColumn({
        name: 'reviewsCount',
        type: 'integer',
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'tobaccos',
      new TableColumn({
        name: 'views',
        type: 'integer',
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'tobaccos',
      new TableColumn({
        name: 'category',
        type: 'varchar',
      }),
    );

    await queryRunner.addColumn(
      'tobaccos',
      new TableColumn({
        name: 'flavorDescriptors',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'tobaccos',
      new TableColumn({
        name: 'dateAdded',
        type: 'datetime',
      }),
    );

    await queryRunner.addColumn(
      'tobaccos',
      new TableColumn({
        name: 'year',
        type: 'integer',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'tobaccos',
      new TableColumn({
        name: 'tier',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Recreate indexes
    await queryRunner.createIndex(
      'tobaccos',
      new TableIndex({
        name: 'IDX_TOBACCOS_PRODUCTION_STATUS',
        columnNames: ['productionStatus'],
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
        name: 'IDX_TOBACCOS_CATEGORY',
        columnNames: ['category'],
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
        name: 'IDX_TOBACCOS_VIEWS',
        columnNames: ['views'],
      }),
    );
  }
}
