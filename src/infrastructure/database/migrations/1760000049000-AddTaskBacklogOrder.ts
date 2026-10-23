import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Jira-vertical prep, 2 of 7: manual drag-order for the backlog.
 * Nothing orders tasks today beyond createdAt; backlog reordering (web + mobile)
 * needs a float rank so an item can be dropped between any two others without
 * rewriting every row (classic "sort key" pattern - new items double the gap).
 */
export class AddTaskBacklogOrder1760000049000 implements MigrationInterface {
  name = 'AddTaskBacklogOrder1760000049000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tasks\`
        ADD COLUMN \`backlog_order\` DOUBLE NULL AFTER \`story_points\`
    `);
    // Seed existing rows so older tasks sort before newer ones, oldest first,
    // leaving headroom between values for future inserts.
    await queryRunner.query(`
      UPDATE \`tasks\` t
      JOIN (
        SELECT \`id\`, (ROW_NUMBER() OVER (PARTITION BY \`project_id\` ORDER BY \`created_at\` ASC)) * 1000 AS rn
        FROM \`tasks\`
      ) ranked ON ranked.id = t.id
      SET t.backlog_order = ranked.rn
    `);
    await queryRunner.query(`
      ALTER TABLE \`tasks\`
        ADD INDEX \`idx_tasks_project_backlog_order\` (\`project_id\`, \`backlog_order\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`tasks\` DROP INDEX \`idx_tasks_project_backlog_order\``);
    await queryRunner.query(`ALTER TABLE \`tasks\` DROP COLUMN \`backlog_order\``);
  }
}
