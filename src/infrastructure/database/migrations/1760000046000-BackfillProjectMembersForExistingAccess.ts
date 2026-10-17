import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Preserves access for people who already used the app before project-scoped
 * visibility: ensure creators + all active org members are on each project.
 * New invites without projectIds still see nothing until access is granted.
 */
export class BackfillProjectMembersForExistingAccess1760000046000
  implements MigrationInterface
{
  name = 'BackfillProjectMembersForExistingAccess1760000046000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const projects = await queryRunner.getTable('projects');
    const members = await queryRunner.getTable('project_members');
    const orgMembers = await queryRunner.getTable('organization_members');
    if (!projects || !members || !orgMembers) return;

    // 1) Project creator → ADMIN (if missing)
    await queryRunner.query(`
      INSERT INTO \`project_members\` (\`id\`, \`project_id\`, \`user_id\`, \`role\`)
      SELECT
        UNHEX(REPLACE(UUID(), '-', '')),
        p.\`id\`,
        p.\`created_by\`,
        'ADMIN'
      FROM \`projects\` p
      WHERE p.\`created_by\` IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM \`project_members\` pm
          WHERE pm.\`project_id\` = p.\`id\`
            AND pm.\`user_id\` = p.\`created_by\`
        )
    `);

    // 2) Every ACTIVE org member → CONTRIBUTOR on each org project (if missing)
    await queryRunner.query(`
      INSERT INTO \`project_members\` (\`id\`, \`project_id\`, \`user_id\`, \`role\`)
      SELECT
        UNHEX(REPLACE(UUID(), '-', '')),
        p.\`id\`,
        om.\`user_id\`,
        'CONTRIBUTOR'
      FROM \`projects\` p
      INNER JOIN \`organization_members\` om
        ON om.\`organization_id\` = p.\`organization_id\`
      WHERE UPPER(om.\`status\`) = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1
          FROM \`project_members\` pm
          WHERE pm.\`project_id\` = p.\`id\`
            AND pm.\`user_id\` = om.\`user_id\`
        )
    `);
  }

  public async down(): Promise<void> {
    // Irreversible data backfill — leave memberships in place.
  }
}
