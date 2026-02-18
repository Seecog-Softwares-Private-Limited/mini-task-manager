"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitDatabaseSchema1700000000000 = void 0;
class InitDatabaseSchema1700000000000 {
    constructor() {
        this.name = 'InitDatabaseSchema1700000000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` BINARY(16) NOT NULL,
        \`full_name\` VARCHAR(150) NOT NULL,
        \`email\` VARCHAR(150) NOT NULL,
        \`password_hash\` TEXT NULL,
        \`avatar_url\` TEXT NULL,
        \`is_email_verified\` TINYINT(1) NOT NULL DEFAULT 0,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_users_email\` (\`email\`)
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`organizations\` (
        \`id\` BINARY(16) NOT NULL,
        \`name\` VARCHAR(150) NOT NULL,
        \`slug\` VARCHAR(150) NOT NULL,
        \`owner_id\` BINARY(16) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_organizations_slug\` (\`slug\`),
        CONSTRAINT \`fk_organizations_owner\` FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`organization_members\` (
        \`id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`user_id\` BINARY(16) NOT NULL,
        \`role\` VARCHAR(50) NOT NULL,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        \`joined_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_org_members_org_user_status\` (\`organization_id\`, \`user_id\`, \`status\`),
        CONSTRAINT \`fk_org_members_org\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_org_members_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`plans\` (
        \`id\` BINARY(16) NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`price_per_user\` DECIMAL(10,2) NULL,
        \`billing_cycle\` VARCHAR(50) NOT NULL,
        \`max_projects\` INT NULL,
        \`max_members\` INT NULL,
        \`features\` JSON NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`subscriptions\` (
        \`id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`plan_id\` BINARY(16) NOT NULL,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'TRIAL',
        \`start_date\` DATE NULL,
        \`end_date\` DATE NULL,
        \`trial_ends_at\` DATE NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_subscriptions_organization_id\` (\`organization_id\`),
        CONSTRAINT \`fk_subscriptions_org\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_subscriptions_plan\` FOREIGN KEY (\`plan_id\`) REFERENCES \`plans\`(\`id\`) ON DELETE RESTRICT
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`invoices\` (
        \`id\` BINARY(16) NOT NULL,
        \`subscription_id\` BINARY(16) NOT NULL,
        \`amount\` DECIMAL(10,2) NOT NULL,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
        \`issued_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`paid_at\` TIMESTAMP NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_invoices_subscription\` FOREIGN KEY (\`subscription_id\`) REFERENCES \`subscriptions\`(\`id\`) ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`payments\` (
        \`id\` BINARY(16) NOT NULL,
        \`invoice_id\` BINARY(16) NOT NULL,
        \`payment_gateway\` VARCHAR(100) NULL,
        \`transaction_id\` VARCHAR(255) NULL,
        \`status\` VARCHAR(50) NULL,
        \`paid_at\` TIMESTAMP NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_payments_invoice\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\`(\`id\`) ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`projects\` (
        \`id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`name\` VARCHAR(200) NOT NULL,
        \`description\` TEXT NULL,
        \`visibility\` VARCHAR(50) NOT NULL DEFAULT 'PRIVATE',
        \`is_archived\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_by\` BINARY(16) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_projects_org_archived\` (\`organization_id\`, \`is_archived\`),
        CONSTRAINT \`fk_projects_org\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_projects_creator\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`project_members\` (
        \`id\` BINARY(16) NOT NULL,
        \`project_id\` BINARY(16) NOT NULL,
        \`user_id\` BINARY(16) NOT NULL,
        \`role\` VARCHAR(50) NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_project_members_project\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_project_members_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`workflows\` (
        \`id\` BINARY(16) NOT NULL,
        \`project_id\` BINARY(16) NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`is_default\` TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_workflows_project\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`workflow_statuses\` (
        \`id\` BINARY(16) NOT NULL,
        \`workflow_id\` BINARY(16) NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`position\` INT NOT NULL,
        \`color\` VARCHAR(20) NULL,
        \`type\` VARCHAR(50) NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_workflow_statuses_workflow\` FOREIGN KEY (\`workflow_id\`) REFERENCES \`workflows\`(\`id\`) ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`sprints\` (
        \`id\` BINARY(16) NOT NULL,
        \`project_id\` BINARY(16) NOT NULL,
        \`name\` VARCHAR(150) NOT NULL,
        \`start_date\` DATE NULL,
        \`end_date\` DATE NULL,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_sprints_project\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tasks\` (
        \`id\` BINARY(16) NOT NULL,
        \`project_id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`title\` VARCHAR(300) NOT NULL,
        \`description\` TEXT NULL,
        \`status_id\` BINARY(16) NULL,
        \`priority\` VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
        \`assignee_id\` BINARY(16) NULL,
        \`assignee_ids\` TEXT NULL,
        \`subtasks\` TEXT NULL,
        \`reporter_id\` BINARY(16) NOT NULL,
        \`parent_task_id\` BINARY(16) NULL,
        \`story_points\` INT NULL,
        \`due_date\` DATE NULL,
        \`estimated_minutes\` INT NULL,
        \`logged_minutes\` INT NOT NULL DEFAULT 0,
        \`sprint_id\` BINARY(16) NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_tasks_project_created\` (\`project_id\`, \`created_at\`),
        INDEX \`idx_tasks_org_id\` (\`organization_id\`, \`id\`),
        CONSTRAINT \`fk_tasks_project\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_tasks_status\` FOREIGN KEY (\`status_id\`) REFERENCES \`workflow_statuses\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`fk_tasks_assignee\` FOREIGN KEY (\`assignee_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`fk_tasks_reporter\` FOREIGN KEY (\`reporter_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`fk_tasks_parent\` FOREIGN KEY (\`parent_task_id\`) REFERENCES \`tasks\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`fk_tasks_sprint\` FOREIGN KEY (\`sprint_id\`) REFERENCES \`sprints\`(\`id\`) ON DELETE RESTRICT
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`task_comments\` (
        \`id\` BINARY(16) NOT NULL,
        \`task_id\` BINARY(16) NOT NULL,
        \`user_id\` BINARY(16) NOT NULL,
        \`comment\` TEXT NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_task_comments_task\` FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_task_comments_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`task_attachments\` (
        \`id\` BINARY(16) NOT NULL,
        \`task_id\` BINARY(16) NOT NULL,
        \`file_url\` TEXT NOT NULL,
        \`file_name\` VARCHAR(255) NULL,
        \`uploaded_by\` BINARY(16) NOT NULL,
        \`uploaded_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_task_attachments_task\` FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_task_attachments_user\` FOREIGN KEY (\`uploaded_by\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`custom_fields\` (
        \`id\` BINARY(16) NOT NULL,
        \`project_id\` BINARY(16) NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`field_type\` VARCHAR(50) NOT NULL,
        \`is_required\` TINYINT(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_custom_fields_project\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\`(\`id\`) ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`task_custom_field_values\` (
        \`id\` BINARY(16) NOT NULL,
        \`task_id\` BINARY(16) NOT NULL,
        \`custom_field_id\` BINARY(16) NOT NULL,
        \`value\` TEXT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_task_custom_values_task\` FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_task_custom_values_field\` FOREIGN KEY (\`custom_field_id\`) REFERENCES \`custom_fields\`(\`id\`) ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`notifications\` (
        \`id\` BINARY(16) NOT NULL,
        \`user_id\` BINARY(16) NOT NULL,
        \`title\` VARCHAR(255) NULL,
        \`message\` TEXT NULL,
        \`is_read\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_notifications_user_created\` (\`user_id\`, \`created_at\`),
        CONSTRAINT \`fk_notifications_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`activity_logs\` (
        \`id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`user_id\` BINARY(16) NULL,
        \`entity_type\` VARCHAR(100) NOT NULL,
        \`entity_id\` BINARY(16) NULL,
        \`action\` VARCHAR(100) NOT NULL,
        \`metadata\` JSON NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_activity_logs_org_created\` (\`organization_id\`, \`created_at\`),
        CONSTRAINT \`fk_activity_logs_org\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_activity_logs_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
      )
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`organization_invitations\` (
        \`id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`role\` VARCHAR(50) NOT NULL,
        \`token\` VARCHAR(64) NOT NULL,
        \`invited_by\` BINARY(16) NOT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        \`expires_at\` TIMESTAMP NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`idx_invitation_token\` (\`token\`),
        INDEX \`idx_invitation_org_email\` (\`organization_id\`, \`email\`),
        CONSTRAINT \`fk_invitation_org\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_invitation_inviter\` FOREIGN KEY (\`invited_by\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
      )
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`organization_invitations\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`activity_logs\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`notifications\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`task_custom_field_values\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`custom_fields\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`task_attachments\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`task_comments\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`tasks\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`sprints\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`workflow_statuses\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`workflows\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`project_members\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`projects\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`payments\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`invoices\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`subscriptions\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`plans\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`organization_members\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`organizations\``);
        await queryRunner.query(`DROP TABLE IF EXISTS \`users\``);
    }
}
exports.InitDatabaseSchema1700000000000 = InitDatabaseSchema1700000000000;
//# sourceMappingURL=1700000000000-InitDatabaseSchema.js.map