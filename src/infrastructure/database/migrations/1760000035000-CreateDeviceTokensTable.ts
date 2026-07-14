import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeviceTokensTable1760000035000 implements MigrationInterface {
  name = 'CreateDeviceTokensTable1760000035000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(`
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'device_tokens'
      LIMIT 1
    `);
    if (Array.isArray(exists) && exists.length > 0) return;

    await queryRunner.query(`
      CREATE TABLE \`device_tokens\` (
        \`id\` BINARY(16) NOT NULL,
        \`user_id\` BINARY(16) NOT NULL,
        \`token\` VARCHAR(512) NOT NULL,
        \`platform\` VARCHAR(16) NOT NULL,
        \`device_id\` VARCHAR(255) NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_device_tokens_token\` (\`token\`),
        KEY \`idx_device_tokens_user\` (\`user_id\`),
        CONSTRAINT \`fk_device_tokens_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`device_tokens\``);
  }
}
