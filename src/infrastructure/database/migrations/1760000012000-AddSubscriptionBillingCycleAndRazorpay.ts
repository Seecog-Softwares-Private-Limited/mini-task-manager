import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionBillingCycleAndRazorpay1760000012000 implements MigrationInterface {
  name = 'AddSubscriptionBillingCycleAndRazorpay1760000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const addColumn = async (sql: string) => {
      try {
        await queryRunner.query(sql);
      } catch {
        /* column may already exist */
      }
    };

    await addColumn(`ALTER TABLE \`subscriptions\` ADD COLUMN \`billing_cycle\` VARCHAR(20) NOT NULL DEFAULT 'monthly'`);
    await addColumn(`ALTER TABLE \`subscriptions\` ADD COLUMN \`razorpay_subscription_id\` VARCHAR(255) NULL`);
    await addColumn(`ALTER TABLE \`subscriptions\` ADD COLUMN \`razorpay_customer_id\` VARCHAR(255) NULL`);
    await addColumn(`ALTER TABLE \`subscriptions\` ADD COLUMN \`cancelled_at\` TIMESTAMP NULL`);
    await addColumn(`ALTER TABLE \`subscriptions\` ADD COLUMN \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dropColumn = async (col: string) => {
      try {
        await queryRunner.query(`ALTER TABLE \`subscriptions\` DROP COLUMN \`${col}\``);
      } catch {
        /* ignore */
      }
    };
    await dropColumn('updated_at');
    await dropColumn('cancelled_at');
    await dropColumn('razorpay_customer_id');
    await dropColumn('razorpay_subscription_id');
    await dropColumn('billing_cycle');
  }
}
