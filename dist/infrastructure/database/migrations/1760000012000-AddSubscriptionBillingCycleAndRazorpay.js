"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddSubscriptionBillingCycleAndRazorpay1760000012000 = void 0;
class AddSubscriptionBillingCycleAndRazorpay1760000012000 {
    constructor() {
        this.name = 'AddSubscriptionBillingCycleAndRazorpay1760000012000';
    }
    async up(queryRunner) {
        const addColumn = async (sql) => {
            try {
                await queryRunner.query(sql);
            }
            catch {
            }
        };
        await addColumn(`ALTER TABLE \`subscriptions\` ADD COLUMN \`billing_cycle\` VARCHAR(20) NOT NULL DEFAULT 'monthly'`);
        await addColumn(`ALTER TABLE \`subscriptions\` ADD COLUMN \`razorpay_subscription_id\` VARCHAR(255) NULL`);
        await addColumn(`ALTER TABLE \`subscriptions\` ADD COLUMN \`razorpay_customer_id\` VARCHAR(255) NULL`);
        await addColumn(`ALTER TABLE \`subscriptions\` ADD COLUMN \`cancelled_at\` TIMESTAMP NULL`);
        await addColumn(`ALTER TABLE \`subscriptions\` ADD COLUMN \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
    }
    async down(queryRunner) {
        const dropColumn = async (col) => {
            try {
                await queryRunner.query(`ALTER TABLE \`subscriptions\` DROP COLUMN \`${col}\``);
            }
            catch {
            }
        };
        await dropColumn('updated_at');
        await dropColumn('cancelled_at');
        await dropColumn('razorpay_customer_id');
        await dropColumn('razorpay_subscription_id');
        await dropColumn('billing_cycle');
    }
}
exports.AddSubscriptionBillingCycleAndRazorpay1760000012000 = AddSubscriptionBillingCycleAndRazorpay1760000012000;
//# sourceMappingURL=1760000012000-AddSubscriptionBillingCycleAndRazorpay.js.map