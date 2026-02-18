"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateOrganizationInvitations1739812800000 = void 0;
const typeorm_1 = require("typeorm");
class CreateOrganizationInvitations1739812800000 {
    constructor() {
        this.name = 'CreateOrganizationInvitations1739812800000';
    }
    async up(queryRunner) {
        const hasTable = await queryRunner.hasTable('organization_invitations');
        if (hasTable)
            return;
        await queryRunner.createTable(new typeorm_1.Table({
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
                new typeorm_1.TableIndex({
                    name: 'idx_invitation_token',
                    columnNames: ['token'],
                    isUnique: true,
                }),
                new typeorm_1.TableIndex({
                    name: 'idx_invitation_org_email',
                    columnNames: ['organization_id', 'email'],
                }),
            ],
            foreignKeys: [
                new typeorm_1.TableForeignKey({
                    name: 'fk_invitation_org',
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
                new typeorm_1.TableForeignKey({
                    name: 'fk_invitation_inviter',
                    columnNames: ['invited_by'],
                    referencedTableName: 'users',
                    referencedColumnNames: ['id'],
                    onDelete: 'RESTRICT',
                }),
            ],
        }), true);
    }
    async down(queryRunner) {
        const hasTable = await queryRunner.hasTable('organization_invitations');
        if (!hasTable)
            return;
        await queryRunner.dropTable('organization_invitations', true, true, true);
    }
}
exports.CreateOrganizationInvitations1739812800000 = CreateOrganizationInvitations1739812800000;
//# sourceMappingURL=1739812800000-CreateOrganizationInvitations.js.map