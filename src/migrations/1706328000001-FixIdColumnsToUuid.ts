import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class FixIdColumnsToUuid1706328000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first to allow column type changes
    await queryRunner.dropForeignKey('lines', 'fk_lines_brand');
    await queryRunner.dropForeignKey('tobaccos', 'fk_tobaccos_brand');
    await queryRunner.dropForeignKey('tobaccos', 'fk_tobaccos_line');

    // Fix brands.id column type from text to uuid
    await queryRunner.query(`
      ALTER TABLE brands 
      ALTER COLUMN id TYPE uuid USING id::uuid;
    `);

    // Fix lines.id column type from text to uuid
    await queryRunner.query(`
      ALTER TABLE lines 
      ALTER COLUMN id TYPE uuid USING id::uuid;
    `);

    // Fix tobaccos.id column type from text to uuid
    await queryRunner.query(`
      ALTER TABLE tobaccos 
      ALTER COLUMN id TYPE uuid USING id::uuid;
    `);

    // Fix api_keys.id column type from text to uuid
    await queryRunner.query(`
      ALTER TABLE api_keys 
      ALTER COLUMN id TYPE uuid USING id::uuid;
    `);

    // Fix foreign key column types
    await queryRunner.query(`
      ALTER TABLE lines 
      ALTER COLUMN "brandId" TYPE uuid USING "brandId"::uuid;
    `);

    await queryRunner.query(`
      ALTER TABLE tobaccos 
      ALTER COLUMN "brandId" TYPE uuid USING "brandId"::uuid;
    `);

    await queryRunner.query(`
      ALTER TABLE tobaccos 
      ALTER COLUMN "lineId" TYPE uuid USING "lineId"::uuid;
    `);

    // Recreate foreign keys
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert id columns back to text
    await queryRunner.query(`
      ALTER TABLE brands 
      ALTER COLUMN id TYPE text USING id::text;
    `);

    await queryRunner.query(`
      ALTER TABLE lines 
      ALTER COLUMN id TYPE text USING id::text;
    `);

    await queryRunner.query(`
      ALTER TABLE tobaccos 
      ALTER COLUMN id TYPE text USING id::text;
    `);

    await queryRunner.query(`
      ALTER TABLE api_keys 
      ALTER COLUMN id TYPE text USING id::text;
    `);

    // Revert foreign key column types
    await queryRunner.query(`
      ALTER TABLE lines 
      ALTER COLUMN brandId TYPE text USING brandId::text;
    `);

    await queryRunner.query(`
      ALTER TABLE tobaccos 
      ALTER COLUMN brandId TYPE text USING brandId::text;
    `);

    await queryRunner.query(`
      ALTER TABLE tobaccos 
      ALTER COLUMN lineId TYPE text USING lineId::text;
    `);
  }
}
