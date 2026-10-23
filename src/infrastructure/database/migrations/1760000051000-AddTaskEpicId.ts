import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Jira-vertical prep, 4 of 7: links a task to its epic.
 * Separate from CreateEpicsTable so the FK target always exists first.
 */
export class AddTaskEpicId1760000051000 implements MigrationInterface {
  name = 'AddTaskEpicId1760000051000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tasks\`
        ADD COLUMN \`epic_id\` BINARY(16) NULL AFTER \`sprint_id\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`tasks\`
        ADD INDEX \`idx_tasks_epic\` (\`epic_id\`),
        ADD CONSTRAINT \`fk_tasks_epic\` FOREIGN KEY (\`epic_id\`) REFERENCES \`epics\`(\`id\`) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`tasks\` DROP FOREIGN KEY \`fk_tasks_epic\``);
    await queryRunner.query(`ALTER TABLE \`tasks\` DROP INDEX \`idx_tasks_epic\``);
    await queryRunner.query(`ALTER TABLE \`tasks\` DROP COLUMN \`epic_id\``);
  }
}
