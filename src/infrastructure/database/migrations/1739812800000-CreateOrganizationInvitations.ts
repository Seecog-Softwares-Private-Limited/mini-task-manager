import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateOrganizationInvitations1739812800000 implements MigrationInterface {
  name = 'CreateOrganizationInvitations1739812800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('organization_invitations');
    if (hasTable) return;

    await queryRunner.createTable(
      new Table({
        name: 'organization_invitations',
        columns: [
          { name: 'id', type: 'binary', length: '16', isPrimary: true },
          { name: 'organization_id', type: 'binary', length: '16', isNullable: false },
          { name: 'email', type: 'varchar', length: '255', isNullable: false },
          { name: 'role', type: 'varchar', length: '50', isNullable: false },
          { name: 'token', type: 'varchar', length: '64', isNullable: false },
          { name: 'invited_by', type: 'binary', length: '16', isNullable: false },
          { name: 'status', type: 'varchar', length: '20', isNullable: false, default: "'PENDING'" },
          { name: 'expires_at', type: 'timestamp', isNullable: false },
          { name: 'created_at', type: 'timestamp', isNullable: false, default: 'CURRENT_TIMESTAMP' },
        ],
        indices: [
          new TableIndex({
            name: 'idx_invitation_token',
            columnNames: ['token'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'idx_invitation_org_email',
            columnNames: ['organization_id', 'email'],
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'fk_invitation_org',
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            name: 'fk_invitation_inviter',
            columnNames: ['invited_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('organization_invitations');
    if (!hasTable) return;
    await queryRunner.dropTable('organization_invitations', true, true, true);
  }
}
