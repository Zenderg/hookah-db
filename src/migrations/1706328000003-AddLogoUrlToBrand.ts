import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLogoUrlToBrand1706328000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'brands',
      new TableColumn({
        name: 'logoUrl',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('brands', 'logoUrl');
  }
}
