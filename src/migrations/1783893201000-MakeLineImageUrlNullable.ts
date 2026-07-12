import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeLineImageUrlNullable1783893201000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "lines" ALTER COLUMN "imageUrl" DROP NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "lines" ALTER COLUMN "imageUrl" SET NOT NULL',
    );
  }
}
