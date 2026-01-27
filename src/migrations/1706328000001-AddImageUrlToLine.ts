import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddImageUrlToLine1706328000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'lines',
      new TableColumn({
        name: 'imageUrl',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('lines', 'imageUrl');
  }
}
