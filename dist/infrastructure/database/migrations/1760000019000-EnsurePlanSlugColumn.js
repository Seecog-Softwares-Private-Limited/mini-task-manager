"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnsurePlanSlugColumn1760000019000 = void 0;
class EnsurePlanSlugColumn1760000019000 {
    constructor() {
        this.name = 'EnsurePlanSlugColumn1760000019000';
    }
    async up(queryRunner) {
        const table = 'plans';
        const conn = queryRunner.connection;
        const dbName = conn?.options?.database
            || process.env.DB_DATABASE
            || 'mini_task_manager';
        const hasColumn = async (column) => {
            const rows = await queryRunner.query(`SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [dbName, table, column]);
            return Array.isArray(rows) && rows.length > 0;
        };
        const addColumn = async (sql) => {
            try {
                await queryRunner.query(sql);
            }
            catch {
            }
        };
        if (!(await hasColumn('slug'))) {
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
    }
    async down() {
    }
}
exports.EnsurePlanSlugColumn1760000019000 = EnsurePlanSlugColumn1760000019000;
//# sourceMappingURL=1760000019000-EnsurePlanSlugColumn.js.map