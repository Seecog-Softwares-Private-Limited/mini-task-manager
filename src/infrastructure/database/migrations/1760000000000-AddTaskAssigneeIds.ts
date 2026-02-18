import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskAssigneeIds1760000000000 implements MigrationInterface {
  name = 'AddTaskAssigneeIds1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tasks\`
      ADD COLUMN \`assignee_ids\` TEXT NULL AFTER \`assignee_id\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tasks\`
      DROP COLUMN \`assignee_ids\`
    `);
  }
}

