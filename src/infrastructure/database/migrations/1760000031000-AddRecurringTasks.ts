import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecurringTasks1760000031000 implements MigrationInterface {
  name = 'AddRecurringTasks1760000031000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasRecurringTemplateId = await queryRunner.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'recurring_template_id'
      LIMIT 1
    `);
    if (!Array.isArray(hasRecurringTemplateId) || hasRecurringTemplateId.length === 0) {
      await queryRunner.query(`
        ALTER TABLE \`tasks\`
        ADD COLUMN \`recurring_template_id\` BINARY(16) NULL AFTER \`sprint_id\`,
        ADD COLUMN \`recurrence_type\` VARCHAR(20) NULL AFTER \`recurring_template_id\`,
        ADD COLUMN \`recurrence_sequence\` INT NULL AFTER \`recurrence_type\`
      `);
      await queryRunner.query(`
        CREATE INDEX \`idx_tasks_recurring_template\` ON \`tasks\` (\`recurring_template_id\`)
      `);
    }

    const hasTemplatesTable = await queryRunner.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recurring_task_templates'
      LIMIT 1
    `);
    if (!Array.isArray(hasTemplatesTable) || hasTemplatesTable.length === 0) {
      await queryRunner.query(`
        CREATE TABLE \`recurring_task_templates\` (
          \`id\` BINARY(16) NOT NULL,
          \`organization_id\` BINARY(16) NOT NULL,
          \`project_id\` BINARY(16) NOT NULL,
          \`created_by\` BINARY(16) NOT NULL,
          \`title\` VARCHAR(300) NOT NULL,
          \`description\` TEXT NULL,
          \`status_id\` BINARY(16) NULL,
          \`priority\` VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
          \`assignee_id\` BINARY(16) NULL,
          \`assignee_ids\` TEXT NULL,
          \`story_points\` INT NULL,
          \`template_subtasks\` TEXT NULL,
          \`tags\` TEXT NULL,
          \`repeat_type\` VARCHAR(20) NOT NULL,
          \`rule_config\` TEXT NULL,
          \`create_days_before_due\` INT NOT NULL DEFAULT 0,
          \`start_due_date\` DATE NOT NULL,
          \`next_due_date\` DATE NOT NULL,
          \`last_generated_due_date\` DATE NULL,
          \`last_sequence\` INT NOT NULL DEFAULT 0,
          \`generated_count\` INT NOT NULL DEFAULT 0,
          \`end_type\` VARCHAR(20) NOT NULL DEFAULT 'NEVER',
          \`end_date\` DATE NULL,
          \`end_after_occurrences\` INT NULL,
          \`is_paused\` TINYINT(1) NOT NULL DEFAULT 0,
          \`stopped_at\` TIMESTAMP NULL,
          \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
      await queryRunner.query(`
        CREATE INDEX \`idx_recurring_tpl_org_project\`
        ON \`recurring_task_templates\` (\`organization_id\`, \`project_id\`)
      `);
      await queryRunner.query(`
        CREATE INDEX \`idx_recurring_tpl_next_due\`
        ON \`recurring_task_templates\` (\`is_paused\`, \`next_due_date\`)
      `);
    }

    const hasOccurrencesTable = await queryRunner.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recurring_task_occurrences'
      LIMIT 1
    `);
    if (!Array.isArray(hasOccurrencesTable) || hasOccurrencesTable.length === 0) {
      await queryRunner.query(`
        CREATE TABLE \`recurring_task_occurrences\` (
          \`id\` BINARY(16) NOT NULL,
          \`template_id\` BINARY(16) NOT NULL,
          \`organization_id\` BINARY(16) NOT NULL,
          \`project_id\` BINARY(16) NOT NULL,
          \`task_id\` BINARY(16) NULL,
          \`sequence_number\` INT NOT NULL,
          \`due_date\` DATE NOT NULL,
          \`state\` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          \`completed_at\` TIMESTAMP NULL,
          \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_recurring_occ_template_sequence\` (\`template_id\`, \`sequence_number\`)
        ) ENGINE=InnoDB
      `);
      await queryRunner.query(`
        CREATE INDEX \`idx_recurring_occ_tpl_due\`
        ON \`recurring_task_occurrences\` (\`template_id\`, \`due_date\`)
      `);
      await queryRunner.query(`
        CREATE INDEX \`idx_recurring_occ_task\`
        ON \`recurring_task_occurrences\` (\`task_id\`)
      `);
      await queryRunner.query(`
        CREATE INDEX \`idx_recurring_occ_org_project_state\`
        ON \`recurring_task_occurrences\` (\`organization_id\`, \`project_id\`, \`state\`)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`recurring_task_occurrences\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`recurring_task_templates\``);

    const hasColumn = await queryRunner.query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'recurring_template_id'
      LIMIT 1
    `);
    if (Array.isArray(hasColumn) && hasColumn.length > 0) {
      await queryRunner.query(`DROP INDEX \`idx_tasks_recurring_template\` ON \`tasks\``).catch(() => {});
      await queryRunner.query(`
        ALTER TABLE \`tasks\`
        DROP COLUMN \`recurring_template_id\`,
        DROP COLUMN \`recurrence_type\`,
        DROP COLUMN \`recurrence_sequence\`
      `);
    }
  }
}

