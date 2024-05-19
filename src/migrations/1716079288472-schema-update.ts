import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaUpdate1716079288472 implements MigrationInterface {
  name = 'SchemaUpdate1716079288472';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."button_type_enum" RENAME TO "button_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."button_type_enum" AS ENUM('SHOUT', 'OVERRIDE', 'RING', 'NONE', 'CONVERTED_SHOUT')`,
    );
    await queryRunner.query(
      `UPDATE "button" SET "type" = 'RING'::public.button_type_enum_old WHERE "type" = 'INTERCOM'::public.button_type_enum_old`,
    );
    await queryRunner.query(
      `ALTER TABLE "button" ALTER COLUMN "type" TYPE "public"."button_type_enum" USING "type"::"text"::"public"."button_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."button_type_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."button_type_enum_old" AS ENUM('SHOUT', 'OVERRIDE', 'INTERCOM', 'RING', 'NONE', 'CONVERTED_SHOUT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "button" ALTER COLUMN "type" TYPE "public"."button_type_enum_old" USING "type"::"text"::"public"."button_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."button_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."button_type_enum_old" RENAME TO "button_type_enum"`,
    );
  }
}
