import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlatformAdminAndOrgStatus1760000022000 implements MigrationInterface {
  name = 'AddPlatformAdminAndOrgStatus1760000022000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasPlatformAdmin = await queryRunner.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_platform_admin'
      LIMIT 1
    `);
    if (!Array.isArray(hasPlatformAdmin) || hasPlatformAdmin.length === 0) {
      await queryRunner.query(`
        ALTER TABLE \`users\`
        ADD COLUMN \`is_platform_admin\` TINYINT(1) NOT NULL DEFAULT 0
      `);
    }

    const hasStatus = await queryRunner.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'status'
      LIMIT 1
    `);
    if (!Array.isArray(hasStatus) || hasStatus.length === 0) {
      await queryRunner.query(`
        ALTER TABLE \`organizations\`
        ADD COLUMN \`status\` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        ADD COLUMN \`suspended_at\` TIMESTAMP NULL,
        ADD COLUMN \`suspension_reason\` TEXT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasStatus = await queryRunner.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'status'
      LIMIT 1
    `);
    if (Array.isArray(hasStatus) && hasStatus.length > 0) {
      await queryRunner.query(`
        ALTER TABLE \`organizations\`
        DROP COLUMN \`status\`,
        DROP COLUMN \`suspended_at\`,
        DROP COLUMN \`suspension_reason\`
      `);
    }

    const hasPlatformAdmin = await queryRunner.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_platform_admin'
      LIMIT 1
    `);
    if (Array.isArray(hasPlatformAdmin) && hasPlatformAdmin.length > 0) {
      await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`is_platform_admin\``);
    }
  }
}
