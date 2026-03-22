"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPaymentsRazorpayColumns1760000013000 = void 0;
class AddPaymentsRazorpayColumns1760000013000 {
    constructor() {
        this.name = 'AddPaymentsRazorpayColumns1760000013000';
    }
    async up(queryRunner) {
        const addColumn = async (sql) => {
            try {
                await queryRunner.query(sql);
            }
            catch {
            }
        };
        try {
            await queryRunner.query(`ALTER TABLE \`payments\` DROP FOREIGN KEY \`fk_payments_invoice\``);
        }
        catch {
        }
        try {
            await queryRunner.query(`ALTER TABLE \`payments\` MODIFY COLUMN \`invoice_id\` BINARY(16) NULL`);
        }
        catch {
        }
        await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`subscription_id\` BINARY(16) NULL`);
        await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`amount\` DECIMAL(10,2) NULL`);
        await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`currency\` VARCHAR(10) NULL DEFAULT 'INR'`);
        await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`razorpay_payment_id\` VARCHAR(255) NULL`);
        await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`razorpay_order_id\` VARCHAR(255) NULL`);
        await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`razorpay_signature\` VARCHAR(500) NULL`);
        await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`method\` VARCHAR(20) NULL`);
        await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`metadata\` JSON NULL`);
        await addColumn(`ALTER TABLE \`payments\` ADD COLUMN \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        try {
            await queryRunner.query(`
        ALTER TABLE \`payments\` ADD CONSTRAINT \`fk_payments_subscription\`
        FOREIGN KEY (\`subscription_id\`) REFERENCES \`subscriptions\`(\`id\`) ON DELETE CASCADE
      `);
        }
        catch {
        }
        try {
            await queryRunner.query(`
        ALTER TABLE \`payments\` ADD CONSTRAINT \`fk_payments_invoice\`
        FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\`(\`id\`) ON DELETE CASCADE
      `);
        }
        catch {
        }
        await addColumn(`ALTER TABLE \`invoices\` ADD COLUMN \`organization_id\` BINARY(16) NULL`);
        await addColumn(`ALTER TABLE \`invoices\` ADD COLUMN \`currency\` VARCHAR(10) NULL DEFAULT 'INR'`);
        await addColumn(`ALTER TABLE \`invoices\` ADD COLUMN \`billing_cycle\` VARCHAR(20) NULL`);
        await addColumn(`ALTER TABLE \`invoices\` ADD COLUMN \`plan_name\` VARCHAR(100) NULL`);
        await addColumn(`ALTER TABLE \`invoices\` ADD COLUMN \`user_count\` INT NULL DEFAULT 1`);
        await addColumn(`ALTER TABLE \`invoices\` ADD COLUMN \`razorpay_invoice_id\` VARCHAR(255) NULL`);
        await addColumn(`ALTER TABLE \`invoices\` ADD COLUMN \`due_date\` TIMESTAMP NULL`);
    }
    async down(queryRunner) {
        const dropColumn = async (col) => {
            try {
                await queryRunner.query(`ALTER TABLE \`payments\` DROP COLUMN \`${col}\``);
            }
            catch {
            }
        };
        try {
            await queryRunner.query(`ALTER TABLE \`payments\` DROP FOREIGN KEY \`fk_payments_subscription\``);
        }
        catch { }
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
exports.AddPaymentsRazorpayColumns1760000013000 = AddPaymentsRazorpayColumns1760000013000;
//# sourceMappingURL=1760000013000-AddPaymentsRazorpayColumns.js.map