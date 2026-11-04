import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendancePeriods1762200000000 implements MigrationInterface {
  name = 'AddAttendancePeriods1762200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendance_periods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "starts_at" date NOT NULL,
        "ends_at" date NOT NULL,
        "is_active" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attendance_periods_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_attendance_periods_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "attendance_periods" ("name", "starts_at", "ends_at", "is_active")
      VALUES
        ('2025-2026', '2025-10-01', '2026-10-01', false),
        ('2026-2027', '2026-11-01', '2027-10-31', true)
      ON CONFLICT ("name") DO UPDATE SET
        "starts_at" = EXCLUDED."starts_at",
        "ends_at" = EXCLUDED."ends_at",
        "is_active" = EXCLUDED."is_active"
    `);
    await queryRunner.query(`ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "period_id" uuid`);
    await queryRunner.query(`
      UPDATE "sessions"
      SET "period_id" = (SELECT "id" FROM "attendance_periods" WHERE "name" = '2025-2026')
      WHERE "period_id" IS NULL
    `);
    await queryRunner.query(`ALTER TABLE "sessions" ALTER COLUMN "period_id" SET NOT NULL`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_sessions_period') THEN
          ALTER TABLE "sessions"
          ADD CONSTRAINT "FK_sessions_period" FOREIGN KEY ("period_id")
          REFERENCES "attendance_periods"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_sessions_period"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "period_id"`);
    await queryRunner.query(`DROP TABLE "attendance_periods"`);
  }
}
