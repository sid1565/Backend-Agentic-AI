import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1781844567684 implements MigrationInterface {
    name = 'InitialSchema1781844567684'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "schools" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "email" character varying(255) NOT NULL, "phone_code" character varying(8) NOT NULL, "phone_number" character varying(20) NOT NULL, "password" character varying(255) NOT NULL, "student_seat" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_95b932e47ac129dd8e23a0db548" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_schools_email" ON "schools" ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."subscriptions_currency_enum" AS ENUM('KWD', 'USD')`);
        await queryRunner.query(`CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('ACTIVE', 'EXPIRED')`);
        await queryRunner.query(`CREATE TABLE "subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "school_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "currency" "public"."subscriptions_currency_enum" NOT NULL, "transaction_id" character varying(100) NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_subscriptions_school_id" ON "subscriptions" ("school_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_subscriptions_transaction_id" ON "subscriptions" ("transaction_id") `);
        await queryRunner.query(`CREATE INDEX "idx_subscriptions_end_date" ON "subscriptions" ("end_date") `);
        await queryRunner.query(`CREATE INDEX "idx_subscriptions_status" ON "subscriptions" ("status") `);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "subject_id" uuid NOT NULL, "subject_type" character varying(16) NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_refresh_token_hash" ON "refresh_tokens" ("token_hash") `);
        await queryRunner.query(`CREATE INDEX "idx_refresh_subject" ON "refresh_tokens" ("subject_id", "subject_type") `);
        await queryRunner.query(`CREATE TABLE "password_reset_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "subject_id" uuid NOT NULL, "subject_type" character varying(16) NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_reset_token_hash" ON "password_reset_tokens" ("token_hash") `);
        await queryRunner.query(`CREATE INDEX "idx_reset_subject" ON "password_reset_tokens" ("subject_id", "subject_type") `);
        await queryRunner.query(`CREATE TABLE "admin_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "name" character varying(200), "password" character varying(255) NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_06744d221bb6145dc61e5dc441d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_admin_users_email" ON "admin_users" ("email") `);
        await queryRunner.query(`CREATE TABLE "announcements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "body" text NOT NULL, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_b3ad760876ff2e19d58e05dc8b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_announcements_created_at" ON "announcements" ("created_at") `);
        await queryRunner.query(`CREATE TABLE "admin_audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actor_id" uuid, "action" character varying(64) NOT NULL, "target_id" uuid, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_de7a8fc2fbb525484c71a86bb96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_audit_actor_id" ON "admin_audit_logs" ("actor_id") `);
        await queryRunner.query(`CREATE INDEX "idx_audit_action" ON "admin_audit_logs" ("action") `);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_c0bece3ccd5c6c711b30450ed9a" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_c0bece3ccd5c6c711b30450ed9a"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_action"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_actor_id"`);
        await queryRunner.query(`DROP TABLE "admin_audit_logs"`);
        await queryRunner.query(`DROP INDEX "public"."idx_announcements_created_at"`);
        await queryRunner.query(`DROP TABLE "announcements"`);
        await queryRunner.query(`DROP INDEX "public"."uq_admin_users_email"`);
        await queryRunner.query(`DROP TABLE "admin_users"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reset_subject"`);
        await queryRunner.query(`DROP INDEX "public"."uq_reset_token_hash"`);
        await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
        await queryRunner.query(`DROP INDEX "public"."idx_refresh_subject"`);
        await queryRunner.query(`DROP INDEX "public"."uq_refresh_token_hash"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`DROP INDEX "public"."idx_subscriptions_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_subscriptions_end_date"`);
        await queryRunner.query(`DROP INDEX "public"."uq_subscriptions_transaction_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_subscriptions_school_id"`);
        await queryRunner.query(`DROP TABLE "subscriptions"`);
        await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."subscriptions_currency_enum"`);
        await queryRunner.query(`DROP INDEX "public"."uq_schools_email"`);
        await queryRunner.query(`DROP TABLE "schools"`);
    }

}
