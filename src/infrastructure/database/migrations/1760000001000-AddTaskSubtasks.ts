import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskSubtasks1760000001000 implements MigrationInterface {
  name = 'AddTaskSubtasks1760000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tasks\`
      ADD COLUMN \`subtasks\` TEXT NULL AFTER \`assignee_ids\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tasks\`
      DROP COLUMN \`subtasks\`
    `);
  }
}

