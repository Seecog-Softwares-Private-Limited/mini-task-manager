import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Jira-vertical prep, 1 of 7: distinguishes issue types.
 * Every task today is untyped; the backlog, create-issue screen and reports
 * all assume STORY / BUG / TASK / SUBTASK.
 */
export class AddTaskType1760000048000 implements MigrationInterface {
  name = 'AddTaskType1760000048000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tasks\`
        ADD COLUMN \`type\` VARCHAR(20) NOT NULL DEFAULT 'TASK' AFTER \`title\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`tasks\`
        ADD INDEX \`idx_tasks_project_type\` (\`project_id\`, \`type\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`tasks\` DROP INDEX \`idx_tasks_project_type\``);
    await queryRunner.query(`ALTER TABLE \`tasks\` DROP COLUMN \`type\``);
  }
}
