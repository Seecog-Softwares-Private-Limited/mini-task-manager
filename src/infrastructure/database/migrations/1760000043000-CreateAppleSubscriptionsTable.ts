import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppleSubscriptionsTable1760000043000
  implements MigrationInterface
{
  name = 'CreateAppleSubscriptionsTable1760000043000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`apple_subscriptions\` (
        \`id\` BINARY(16) NOT NULL,
        \`user_id\` BINARY(16) NOT NULL,
        \`product_id\` VARCHAR(128) NOT NULL,
        \`plan_slug\` VARCHAR(20) NOT NULL,
        \`original_transaction_id\` VARCHAR(64) NOT NULL,
        \`latest_transaction_id\` VARCHAR(64) NOT NULL,
        \`environment\` VARCHAR(32) NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'active',
        \`expires_at\` TIMESTAMP NULL,
        \`purchased_at\` TIMESTAMP NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_apple_subscriptions_original_tx\` (\`original_transaction_id\`),
        KEY \`IDX_apple_subscriptions_user_id\` (\`user_id\`),
        CONSTRAINT \`FK_apple_subscriptions_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
          ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const hasBillingSource = await queryRunner.query(`
      SELECT COUNT(*) AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'plan_billing_source'
    `);
    if (Number(hasBillingSource?.[0]?.c ?? 0) === 0) {
      await queryRunner.query(`
        ALTER TABLE \`users\`
          ADD COLUMN \`plan_billing_source\` VARCHAR(20) NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`apple_subscriptions\``);
    const hasBillingSource = await queryRunner.query(`
      SELECT COUNT(*) AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'plan_billing_source'
    `);
    if (Number(hasBillingSource?.[0]?.c ?? 0) > 0) {
      await queryRunner.query(`
        ALTER TABLE \`users\` DROP COLUMN \`plan_billing_source\`
      `);
    }
  }
}
