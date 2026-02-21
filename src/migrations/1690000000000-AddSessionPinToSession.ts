import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSessionPinToSession21690000000000 implements MigrationInterface {
    name = 'AddSessionPinToSession21690000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "sessions"
            ADD COLUMN IF NOT EXISTS "session_pin" character varying(4)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "sessions"
            DROP COLUMN IF EXISTS "session_pin"
        `);
    }
}