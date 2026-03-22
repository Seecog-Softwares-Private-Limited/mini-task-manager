"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPlanSlugAndColumns1760000011000 = void 0;
class AddPlanSlugAndColumns1760000011000 {
    constructor() {
        this.name = 'AddPlanSlugAndColumns1760000011000';
    }
    async up(queryRunner) {
        const addColumn = async (sql) => {
            try {
                await queryRunner.query(sql);
            }
            catch {
            }
        };
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`slug\` VARCHAR(50) NULL`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`price_monthly\` DECIMAL(10,2) NOT NULL DEFAULT 0`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`price_yearly\` DECIMAL(10,2) NOT NULL DEFAULT 0`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`currency\` VARCHAR(10) NOT NULL DEFAULT 'INR'`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`max_users\` INT NULL`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`storage_limit_gb\` INT NULL`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`automation_limit\` INT NULL`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`integration_limit\` INT NULL`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`api_enabled\` TINYINT(1) NOT NULL DEFAULT 0`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`sso_enabled\` TINYINT(1) NOT NULL DEFAULT 0`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`audit_logs_enabled\` TINYINT(1) NOT NULL DEFAULT 0`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`custom_workflows\` TINYINT(1) NOT NULL DEFAULT 0`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`advanced_reporting\` TINYINT(1) NOT NULL DEFAULT 0`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`time_tracking\` TINYINT(1) NOT NULL DEFAULT 0`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`priority_support\` TINYINT(1) NOT NULL DEFAULT 0`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`sla_uptime\` VARCHAR(10) NULL`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`display_order\` INT NOT NULL DEFAULT 0`);
        await addColumn(`ALTER TABLE \`plans\` ADD COLUMN \`is_popular\` TINYINT(1) NOT NULL DEFAULT 0`);
        await queryRunner.query(`
      UPDATE \`plans\` SET \`slug\` = LOWER(REPLACE(REPLACE(\`name\`, ' ', '-'), ' ', ''))
      WHERE \`slug\` IS NULL
    `);
        await queryRunner.query(`
      UPDATE \`plans\` SET \`slug\` = 'free' WHERE \`slug\` = '' OR \`slug\` IS NULL
    `);
        try {
            await queryRunner.query(`ALTER TABLE \`plans\` MODIFY COLUMN \`slug\` VARCHAR(50) NOT NULL`);
        }
        catch {
        }
        try {
            await queryRunner.query(`ALTER TABLE \`plans\` ADD UNIQUE KEY \`UQ_plans_slug\` (\`slug\`)`);
        }
        catch {
        }
    }
    async down(queryRunner) {
        const dropColumn = async (col) => {
            try {
                await queryRunner.query(`ALTER TABLE \`plans\` DROP COLUMN \`${col}\``);
            }
            catch {
            }
        };
        try {
            await queryRunner.query(`ALTER TABLE \`plans\` DROP INDEX \`UQ_plans_slug\``);
        }
        catch {
        }
        await dropColumn('is_popular');
        await dropColumn('display_order');
        await dropColumn('sla_uptime');
        await dropColumn('priority_support');
        await dropColumn('time_tracking');
        await dropColumn('advanced_reporting');
        await dropColumn('custom_workflows');
        await dropColumn('audit_logs_enabled');
        await dropColumn('sso_enabled');
        await dropColumn('api_enabled');
        await dropColumn('integration_limit');
        await dropColumn('automation_limit');
        await dropColumn('storage_limit_gb');
        await dropColumn('max_users');
        await dropColumn('currency');
        await dropColumn('price_yearly');
        await dropColumn('price_monthly');
        await dropColumn('slug');
    }
}
exports.AddPlanSlugAndColumns1760000011000 = AddPlanSlugAndColumns1760000011000;
//# sourceMappingURL=1760000011000-AddPlanSlugAndColumns.js.map