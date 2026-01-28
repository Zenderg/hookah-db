import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLineFields1706328000004 implements MigrationInterface {
  name = 'AddLineFields1706328000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // SQLite doesn't support adding multiple columns in a single ALTER TABLE statement
    await queryRunner.query(`
      ALTER TABLE "lines" ADD COLUMN "strengthOfficial" varchar(255) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "lines" ADD COLUMN "strengthByRatings" varchar(255) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "lines" ADD COLUMN "status" varchar(255) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "lines" ADD COLUMN "rating" decimal NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "lines" ADD COLUMN "ratingsCount" integer NULL
    `);

    // Add indexes for performance
    await queryRunner.query(`
      CREATE INDEX "idx_lines_rating" ON "lines"("rating")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_lines_status" ON "lines"("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_lines_strength" ON "lines"("strengthOfficial")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_lines_strength"`);
    await queryRunner.query(`DROP INDEX "idx_lines_status"`);
    await queryRunner.query(`DROP INDEX "idx_lines_rating"`);

    await queryRunner.query(`
      ALTER TABLE "lines"
      DROP COLUMN "ratingsCount",
      DROP COLUMN "rating",
      DROP COLUMN "status",
      DROP COLUMN "strengthByRatings",
      DROP COLUMN "strengthOfficial"
    `);
  }
}
