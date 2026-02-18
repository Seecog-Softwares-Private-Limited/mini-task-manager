"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const bcrypt = require("bcrypt");
const configuration_1 = require("../../../config/configuration");
const uuid_util_1 = require("../../../common/utils/uuid.util");
const user_entity_1 = require("../../../modules/users/entities/user.entity");
const organization_member_entity_1 = require("../../../modules/organizations/entities/organization-member.entity");
const project_member_entity_1 = require("../../../modules/projects/entities/project-member.entity");
const organization_entity_1 = require("../../../modules/organizations/entities/organization.entity");
const project_entity_1 = require("../../../modules/projects/entities/project.entity");
const ADMIN_EMAIL = 'admin@example.com';
const PASSWORD = 'Password123!';
async function addAdmin() {
    const dbConfig = (0, configuration_1.configuration)().database;
    const dataSource = new typeorm_1.DataSource({
        type: 'mysql',
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
        entities: [
            user_entity_1.UserEntity,
            organization_entity_1.OrganizationEntity,
            organization_member_entity_1.OrganizationMemberEntity,
            project_entity_1.ProjectEntity,
            project_member_entity_1.ProjectMemberEntity,
        ],
        synchronize: false,
        logging: dbConfig.logging ?? false,
    });
    await dataSource.initialize();
    console.log('Database connected. Adding admin...');
    const hash = await bcrypt.hash(PASSWORD, 10);
    await dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(user_entity_1.UserEntity);
        const orgRepo = manager.getRepository(organization_entity_1.OrganizationEntity);
        const orgMemberRepo = manager.getRepository(organization_member_entity_1.OrganizationMemberEntity);
        const projectRepo = manager.getRepository(project_entity_1.ProjectEntity);
        const projectMemberRepo = manager.getRepository(project_member_entity_1.ProjectMemberEntity);
        let admin = await userRepo.findOne({ where: { email: ADMIN_EMAIL } });
        let adminId;
        if (!admin) {
            adminId = (0, uuid_util_1.generateUuid)();
            await userRepo.save(userRepo.create({
                id: adminId,
                email: ADMIN_EMAIL,
                fullName: 'Seed Admin',
                passwordHash: hash,
            }));
            console.log('  Created user: admin@example.com');
        }
        else {
            adminId = admin.id;
            console.log('  User admin@example.com already exists');
        }
        const orgs = await orgRepo.find({ take: 20 });
        const seedOrg = orgs.find((o) => o.name === 'Seed Org' || o.slug?.startsWith('seed-org'));
        if (!seedOrg) {
            throw new Error('No Seed Org found. Run full seed first: npm run seed');
        }
        const existingOrgMember = await orgMemberRepo.findOne({
            where: { organizationId: seedOrg.id, userId: adminId },
        });
        if (!existingOrgMember) {
            await orgMemberRepo.save(orgMemberRepo.create({
                id: (0, uuid_util_1.generateUuid)(),
                organizationId: seedOrg.id,
                userId: adminId,
                role: 'admin',
                status: 'ACTIVE',
            }));
            console.log('  Added admin to organization: Seed Org');
        }
        else {
            console.log('  Admin already in organization');
        }
        const projects = await projectRepo.find({
            where: { organizationId: seedOrg.id },
            take: 10,
        });
        for (const project of projects) {
            const existing = await projectMemberRepo.findOne({
                where: { projectId: project.id, userId: adminId },
            });
            if (!existing) {
                await projectMemberRepo.save(projectMemberRepo.create({
                    id: (0, uuid_util_1.generateUuid)(),
                    projectId: project.id,
                    userId: adminId,
                    role: 'ADMIN',
                }));
                console.log(`  Added admin to project: ${project.name} (ADMIN role)`);
            }
        }
    });
    await dataSource.destroy();
    console.log('\nDone. Login with admin@example.com / Password123!');
    console.log('Select "Seed Org" and open a project to see the Invite button.');
}
addAdmin().catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
});
//# sourceMappingURL=add-admin.js.map