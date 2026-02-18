"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateOrganizationInvitations1739812800000 = void 0;
class CreateOrganizationInvitations1739812800000 {
    constructor() {
        this.name = 'CreateOrganizationInvitations1739812800000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE \`organization_invitations\` (
        \`id\` BINARY(16) NOT NULL,
        \`organization_id\` BINARY(16) NOT NULL,
        \`email\` VARCHAR(255) NOT NULL,
        \`role\` VARCHAR(50) NOT NULL,
        \`token\` VARCHAR(64) NOT NULL,
        \`invited_by\` BINARY(16) NOT NULL,
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        \`expires_at\` TIMESTAMP NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`idx_invitation_token\` (\`token\`),
        INDEX \`idx_invitation_org_email\` (\`organization_id\`, \`email\`),
        CONSTRAINT \`fk_invitation_org\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_invitation_inviter\` FOREIGN KEY (\`invited_by\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
      )
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS \`organization_invitations\``);
    }
}
exports.CreateOrganizationInvitations1739812800000 = CreateOrganizationInvitations1739812800000;
//# sourceMappingURL=1739812800000-CreateOrganizationInvitations.js.map