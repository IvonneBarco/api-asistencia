import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSaintLoans1760000000000 implements MigrationInterface {
  name = 'CreateSaintLoans1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."saint_loans_saint_enum" AS ENUM('Rosa Mística', 'Medalla Milagrosa', 'Sagrado Corazón')`);
    await queryRunner.query(`CREATE TABLE "saint_loans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" uuid NOT NULL, "user_id" uuid NOT NULL, "saint" "public"."saint_loans_saint_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_saint_loans_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "saint_loans" ADD CONSTRAINT "FK_saint_loans_session" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "saint_loans" ADD CONSTRAINT "FK_saint_loans_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "saint_loans" ADD CONSTRAINT "UQ_saint_loans_session_saint" UNIQUE ("session_id", "saint")`);
    await queryRunner.query(`ALTER TABLE "saint_loans" ADD CONSTRAINT "UQ_saint_loans_session_user" UNIQUE ("session_id", "user_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "saint_loans" DROP CONSTRAINT "UQ_saint_loans_session_user"`);
    await queryRunner.query(`ALTER TABLE "saint_loans" DROP CONSTRAINT "UQ_saint_loans_session_saint"`);
    await queryRunner.query(`ALTER TABLE "saint_loans" DROP CONSTRAINT "FK_saint_loans_user"`);
    await queryRunner.query(`ALTER TABLE "saint_loans" DROP CONSTRAINT "FK_saint_loans_session"`);
    await queryRunner.query(`DROP TABLE "saint_loans"`);
    await queryRunner.query(`DROP TYPE "public"."saint_loans_saint_enum"`);
  }
}