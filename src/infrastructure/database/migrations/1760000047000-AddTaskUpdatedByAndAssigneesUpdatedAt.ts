import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskUpdatedByAndAssigneesUpdatedAt1760000047000
  implements MigrationInterface
{
  name = 'AddTaskUpdatedByAndAssigneesUpdatedAt1760000047000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tasks\`
        ADD COLUMN \`updated_by\` BINARY(16) NULL AFTER \`reporter_id\`,
        ADD COLUMN \`assignees_updated_at\` TIMESTAMP NULL AFTER \`assignee_ids\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tasks\`
        DROP COLUMN \`assignees_updated_at\`,
        DROP COLUMN \`updated_by\`
    `);
  }
}
