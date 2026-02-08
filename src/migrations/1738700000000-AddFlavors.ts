import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddFlavors1738700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create flavors table
    await queryRunner.createTable(
      new Table({
        name: 'flavors',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create index on flavors.name
    await queryRunner.createIndex(
      'flavors',
      new TableIndex({
        name: 'idx_flavors_name',
        columnNames: ['name'],
      }),
    );

    // Create tobacco_flavors junction table
    await queryRunner.createTable(
      new Table({
        name: 'tobacco_flavors',
        columns: [
          {
            name: 'tobaccoId',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'flavorId',
            type: 'uuid',
            isPrimary: true,
          },
        ],
      }),
      true,
    );

    // Create indexes on junction table FK columns
    await queryRunner.createIndex(
      'tobacco_flavors',
      new TableIndex({
        name: 'idx_tobacco_flavors_tobaccoId',
        columnNames: ['tobaccoId'],
      }),
    );

    await queryRunner.createIndex(
      'tobacco_flavors',
      new TableIndex({
        name: 'idx_tobacco_flavors_flavorId',
        columnNames: ['flavorId'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'tobacco_flavors',
      new TableForeignKey({
        columnNames: ['tobaccoId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tobaccos',
        onDelete: 'CASCADE',
        name: 'fk_tobacco_flavors_tobacco',
      }),
    );

    await queryRunner.createForeignKey(
      'tobacco_flavors',
      new TableForeignKey({
        columnNames: ['flavorId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'flavors',
        onDelete: 'CASCADE',
        name: 'fk_tobacco_flavors_flavor',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'tobacco_flavors',
      'fk_tobacco_flavors_flavor',
    );
    await queryRunner.dropForeignKey(
      'tobacco_flavors',
      'fk_tobacco_flavors_tobacco',
    );
    await queryRunner.dropIndex(
      'tobacco_flavors',
      'idx_tobacco_flavors_flavorId',
    );
    await queryRunner.dropIndex(
      'tobacco_flavors',
      'idx_tobacco_flavors_tobaccoId',
    );
    await queryRunner.dropTable('tobacco_flavors');
    await queryRunner.dropIndex('flavors', 'idx_flavors_name');
    await queryRunner.dropTable('flavors');
  }
}
