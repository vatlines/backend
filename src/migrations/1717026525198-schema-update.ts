import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1717026525198 implements MigrationInterface {
    name = 'SchemaUpdate1717026525198'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "configuration-layout" DROP CONSTRAINT "FK_ac2cf043fdb7a824902fbbe8ecf"`);
        await queryRunner.query(`ALTER TABLE "configuration-layout" DROP CONSTRAINT "FK_faee05098d1905d2069cfe79556"`);
        await queryRunner.query(`ALTER TABLE "configuration-layout" ADD CONSTRAINT "FK_ac2cf043fdb7a824902fbbe8ecf" FOREIGN KEY ("configurationId") REFERENCES "position_configuration"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "configuration-layout" ADD CONSTRAINT "FK_faee05098d1905d2069cfe79556" FOREIGN KEY ("buttonId") REFERENCES "button"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "configuration-layout" DROP CONSTRAINT "FK_faee05098d1905d2069cfe79556"`);
        await queryRunner.query(`ALTER TABLE "configuration-layout" DROP CONSTRAINT "FK_ac2cf043fdb7a824902fbbe8ecf"`);
        await queryRunner.query(`ALTER TABLE "configuration-layout" ADD CONSTRAINT "FK_faee05098d1905d2069cfe79556" FOREIGN KEY ("buttonId") REFERENCES "button"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "configuration-layout" ADD CONSTRAINT "FK_ac2cf043fdb7a824902fbbe8ecf" FOREIGN KEY ("configurationId") REFERENCES "position_configuration"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
