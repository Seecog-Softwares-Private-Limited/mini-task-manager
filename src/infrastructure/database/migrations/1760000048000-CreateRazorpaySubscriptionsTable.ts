import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRazorpaySubscriptionsTable1760000048000
  implements MigrationInterface
{
  name = 'CreateRazorpaySubscriptionsTable1760000048000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`razorpay_subscriptions\` (
        \`id\` BINARY(16) NOT NULL,
        \`user_id\` BINARY(16) NOT NULL,
        \`plan_slug\` VARCHAR(20) NOT NULL,
        \`razorpay_subscription_id\` VARCHAR(64) NOT NULL,
        \`razorpay_customer_id\` VARCHAR(64) NULL,
        \`razorpay_plan_id\` VARCHAR(64) NOT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'created',
        \`latest_payment_id\` VARCHAR(64) NULL,
        \`expires_at\` TIMESTAMP NULL,
        \`purchased_at\` TIMESTAMP NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_razorpay_subscriptions_sub_id\` (\`razorpay_subscription_id\`),
        KEY \`IDX_razorpay_subscriptions_user_id\` (\`user_id\`),
        CONSTRAINT \`FK_razorpay_subscriptions_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
          ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const hasPlanCol = await queryRunner.query(`
      SELECT COUNT(*) AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'plan_configurations'
        AND COLUMN_NAME = 'razorpay_plan_id'
    `);
    if (Number(hasPlanCol?.[0]?.c ?? 0) === 0) {
      await queryRunner.query(`
        ALTER TABLE \`plan_configurations\`
          ADD COLUMN \`razorpay_plan_id\` VARCHAR(64) NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`razorpay_subscriptions\``);
    const hasPlanCol = await queryRunner.query(`
      SELECT COUNT(*) AS c FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'plan_configurations'
        AND COLUMN_NAME = 'razorpay_plan_id'
    `);
    if (Number(hasPlanCol?.[0]?.c ?? 0) > 0) {
      await queryRunner.query(`
        ALTER TABLE \`plan_configurations\` DROP COLUMN \`razorpay_plan_id\`
      `);
    }
  }
}
