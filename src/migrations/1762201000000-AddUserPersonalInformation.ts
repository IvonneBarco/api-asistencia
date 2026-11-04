import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPersonalInformation1762201000000 implements MigrationInterface {
  name = 'AddUserPersonalInformation1762201000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birth_date" date`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_emaus_retreat_date" date`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number" character varying(30)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "phone_number"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "first_emaus_retreat_date"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "birth_date"`);
  }
}
