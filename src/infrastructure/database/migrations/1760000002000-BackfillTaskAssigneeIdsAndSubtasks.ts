import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillTaskAssigneeIdsAndSubtasks1760000002000
  implements MigrationInterface
{
  name = 'BackfillTaskAssigneeIdsAndSubtasks1760000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backfill assignee_ids from legacy assignee_id for existing rows.
    await queryRunner.query(`
      UPDATE \`tasks\`
      SET \`assignee_ids\` = JSON_ARRAY(BIN_TO_UUID(\`assignee_id\`))
      WHERE \`assignee_id\` IS NOT NULL
        AND (\`assignee_ids\` IS NULL OR \`assignee_ids\` = '')
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: this data backfill is intentionally non-destructive.
  }
}

