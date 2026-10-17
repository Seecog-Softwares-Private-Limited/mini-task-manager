import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvitationProjectIds1760000045000 implements MigrationInterface {
  name = 'AddInvitationProjectIds1760000045000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('organization_invitations');
    if (!table) return;
    if (table.findColumnByName('project_ids')) return;

    await queryRunner.query(`
      ALTER TABLE \`organization_invitations\`
      ADD COLUMN \`project_ids\` json NULL
      COMMENT 'Optional project IDs the invitee should join on accept'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('organization_invitations');
    if (!table?.findColumnByName('project_ids')) return;
    await queryRunner.query(`
      ALTER TABLE \`organization_invitations\`
      DROP COLUMN \`project_ids\`
    `);
  }
}
