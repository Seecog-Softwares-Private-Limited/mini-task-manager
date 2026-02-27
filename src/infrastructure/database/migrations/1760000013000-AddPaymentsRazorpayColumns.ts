import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentsRazorpayColumns1760000013000 implements MigrationInterface {
  name = 'AddPaymentsRazorpayColumns1760000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const addColumn = async (sql: string) => {
      try {
        await queryRunner.query(sql);
      } catch {
        /* column may already exist */
      }
    };

    // Drop FK so we can modify invoice_id
    try {
      await queryRunner.query(`ALTER TABLE \`payments\` DROP FOREIGN KEY \`fk_payments_invoice\``);
    } catch {
      /* FK may not exist */
    }

    // Make invoice_id nullable (subscription-based payments don't have invoice until after verification)
    try {
      await queryRunner.query(`ALTER TABLE \`payments\` MODIFY COLUMN \`invoice_id\` BINARY(16) NULL`);
    } catch {
      /* already nullable */
    }

    // Add subscription_id for Razorpay payment flow
    await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`subscription_id\` BINARY(16) NULL`);
    await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`amount\` DECIMAL(10,2) NULL`);
    await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`currency\` VARCHAR(10) NULL DEFAULT 'INR'`);
    await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`razorpay_payment_id\` VARCHAR(255) NULL`);
    await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`razorpay_order_id\` VARCHAR(255) NULL`);
    await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`razorpay_signature\` VARCHAR(500) NULL`);
    await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`method\` VARCHAR(20) NULL`);
    await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`metadata\` JSON NULL`);
    await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);

    // Add FK for subscription_id
    try {
      await queryRunner.query(`
        ALTER TABLE \`payments\` ADD CONSTRAINT \`fk_payments_subscription\`
        FOREIGN KEY (\`subscription_id\`) REFERENCES \`subscriptions\`(\`id\`) ON DELETE CASCADE
      `);
    } catch {
      /* FK may already exist */
    }

    // Re-add invoice FK if we dropped it
    try {
      await queryRunner.query(`
        ALTER TABLE \`payments\` ADD CONSTRAINT \`fk_payments_invoice\`
        FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\`(\`id\`) ON DELETE CASCADE
      `);
    } catch {
      /* FK may already exist */
    }

    // Add missing columns to invoices for InvoiceEntity
    await addColumn(`ALTER TABLE \`invoices\` ADD COLUMN \`organization_id\` BINARY(16) NULL`);
    await addColumn(`ALTER TABLE \`invoices\` ADD COLUMN \`currency\` VARCHAR(10) NULL DEFAULT 'INR'`);
    await addColumn(`ALTER TABLE \`invoices\` ADD COLUMN \`billing_cycle\` VARCHAR(20) NULL`);
    await addColumn(`ALTER TABLE \`invoices\` ADD COLUMN \`plan_name\` VARCHAR(100) NULL`);
    await addColumn(`ALTER TABLE \`invoices\` ADD COLUMN \`user_count\` INT NULL DEFAULT 1`);
    await addColumn(`ALTER TABLE \`invoices\` ADD COLUMN \`razorpay_invoice_id\` VARCHAR(255) NULL`);
    await addColumn(`ALTER TABLE \`invoices\` ADD COLUMN \`due_date\` TIMESTAMP NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dropColumn = async (col: string) => {
      try {
        await queryRunner.query(`ALTER TABLE \`payments\` DROP COLUMN \`${col}\``);
      } catch {
        /* ignore */
      }
    };
    try {
      await queryRunner.query(`ALTER TABLE \`payments\` DROP FOREIGN KEY \`fk_payments_subscription\``);
    } catch { /* ignore */ }
    await dropColumn('created_at');
    await dropColumn('metadata');
    await dropColumn('method');
    await dropColumn('razorpay_signature');
    await dropColumn('razorpay_order_id');
    await dropColumn('razorpay_payment_id');
    await dropColumn('currency');
    await dropColumn('amount');
    await dropColumn('subscription_id');
  }
}
