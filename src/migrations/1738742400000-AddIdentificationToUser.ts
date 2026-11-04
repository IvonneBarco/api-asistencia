import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIdentificationToUser1738742400000 implements MigrationInterface {
    name = 'AddIdentificationToUser1738742400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Agregar columna identification (nullable temporalmente)
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "identification" character varying`);
        
        // Hacer email y pin_hash opcionales
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "pin_hash" DROP NOT NULL`);
        
        // Agregar constraint unique para identification
        await queryRunner.query(`
            DO $$ BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'UQ_users_identification'
              ) THEN
                ALTER TABLE "users" ADD CONSTRAINT "UQ_users_identification" UNIQUE ("identification");
              END IF;
            END $$;
        `);
        
        // NOTA: Los usuarios existentes tendrán identification NULL
        // Deberás asignarles un número de identificación manualmente
        // Para hacer identification obligatorio en el futuro, ejecuta:
        // ALTER TABLE "users" ALTER COLUMN "identification" SET NOT NULL;
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir cambios
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_users_identification"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "pin_hash" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "identification"`);
    }
}
