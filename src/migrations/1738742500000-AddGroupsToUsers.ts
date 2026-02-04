import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGroupsToUsers1738742500000 implements MigrationInterface {
    name = 'AddGroupsToUsers1738742500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crear tabla groups
        await queryRunner.query(`
            CREATE TABLE "groups" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_groups_name" UNIQUE ("name"),
                CONSTRAINT "PK_groups" PRIMARY KEY ("id")
            )
        `);

        // Crear tabla group_assignment_audits
        await queryRunner.query(`
            CREATE TABLE "group_assignment_audits" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "previous_group_id" uuid,
                "new_group_id" uuid,
                "changed_by_user_id" uuid NOT NULL,
                "reason" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_group_assignment_audits" PRIMARY KEY ("id")
            )
        `);

        // Agregar columna group_id a users
        await queryRunner.query(`ALTER TABLE "users" ADD "group_id" uuid`);

        // Crear foreign keys
        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD CONSTRAINT "FK_users_group" 
            FOREIGN KEY ("group_id") REFERENCES "groups"("id") 
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "group_assignment_audits" 
            ADD CONSTRAINT "FK_audit_user" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "group_assignment_audits" 
            ADD CONSTRAINT "FK_audit_previous_group" 
            FOREIGN KEY ("previous_group_id") REFERENCES "groups"("id") 
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "group_assignment_audits" 
            ADD CONSTRAINT "FK_audit_new_group" 
            FOREIGN KEY ("new_group_id") REFERENCES "groups"("id") 
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "group_assignment_audits" 
            ADD CONSTRAINT "FK_audit_changed_by" 
            FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // Insertar grupos predeterminados
        await queryRunner.query(`
            INSERT INTO "groups" ("name", "is_active") VALUES
            ('Grupo 1', true),
            ('Grupo 2', true),
            ('Grupo 3', true)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar foreign keys
        await queryRunner.query(`ALTER TABLE "group_assignment_audits" DROP CONSTRAINT "FK_audit_changed_by"`);
        await queryRunner.query(`ALTER TABLE "group_assignment_audits" DROP CONSTRAINT "FK_audit_new_group"`);
        await queryRunner.query(`ALTER TABLE "group_assignment_audits" DROP CONSTRAINT "FK_audit_previous_group"`);
        await queryRunner.query(`ALTER TABLE "group_assignment_audits" DROP CONSTRAINT "FK_audit_user"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_group"`);

        // Eliminar columna group_id de users
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "group_id"`);

        // Eliminar tablas
        await queryRunner.query(`DROP TABLE "group_assignment_audits"`);
        await queryRunner.query(`DROP TABLE "groups"`);
    }
}
