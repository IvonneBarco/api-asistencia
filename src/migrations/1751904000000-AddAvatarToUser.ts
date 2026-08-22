import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarToUser1751904000000 implements MigrationInterface {
  name = 'AddAvatarToUser1751904000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "avatar" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "avatar"`,
    );
  }
}