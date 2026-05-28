"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(process.cwd(), 'properties.env') });
const typeorm_1 = require("typeorm");
const configuration_1 = require("../../../config/configuration");
const uuid_util_1 = require("../../../common/utils/uuid.util");
const user_entity_1 = require("../../../modules/users/entities/user.entity");
const organization_entity_1 = require("../../../modules/organizations/entities/organization.entity");
const organization_member_entity_1 = require("../../../modules/organizations/entities/organization-member.entity");
const PASSWORD = process.env.SEED_USER_PASSWORD || 'Password123!';
function avatarUrlForIndex(i) {
    const img = 10 + i;
    return `https://i.pravatar.cc/300?img=${img}`;
}
const SEED_MEMBERS = [
    { suffix: '01', fullName: 'Alex Rivera' },
    { suffix: '02', fullName: 'Jordan Chen' },
    { suffix: '03', fullName: 'Sam Okonkwo' },
    { suffix: '04', fullName: 'Taylor Brooks' },
    { suffix: '05', fullName: 'Riley Patel' },
    { suffix: '06', fullName: 'Casey Nguyen' },
    { suffix: '07', fullName: 'Morgan Silva' },
    { suffix: '08', fullName: 'Jamie Foster' },
    { suffix: '09', fullName: 'Quinn Murphy' },
    { suffix: '10', fullName: 'Avery Kim' },
];
function normalizeName(s) {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}
async function findTargetOrg(orgRepo) {
    const envSlug = process.env.ORG_SLUG?.trim().toLowerCase();
    const all = await orgRepo.find();
    if (envSlug) {
        const bySlug = all.find((o) => o.slug?.toLowerCase() === envSlug);
        if (bySlug)
            return bySlug;
    }
    const target = normalizeName('Personal Solutions');
    return (all.find((o) => normalizeName(o.name) === target) ??
        all.find((o) => o.slug?.toLowerCase() === 'personal-solutions') ??
        null);
}
async function run() {
    const dbConfig = (0, configuration_1.configuration)().database;
    const dataSource = new typeorm_1.DataSource({
        type: 'mysql',
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
        entities: [user_entity_1.UserEntity, organization_entity_1.OrganizationEntity, organization_member_entity_1.OrganizationMemberEntity],
        synchronize: false,
        logging: dbConfig.logging ?? false,
    });
    await dataSource.initialize();
    console.log('Database connected. Seeding Personal Solutions members...');
    await dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(user_entity_1.UserEntity);
        const orgRepo = manager.getRepository(organization_entity_1.OrganizationEntity);
        const orgMemberRepo = manager.getRepository(organization_member_entity_1.OrganizationMemberEntity);
        const org = await findTargetOrg(orgRepo);
        if (!org) {
            throw new Error('Workspace not found. Create a workspace named "Personal Solutions" (slug personal-solutions) first, ' +
                'or set ORG_SLUG to an existing organization slug.');
        }
        console.log(`  Target workspace: "${org.name}" (${org.slug})`);
        for (let i = 0; i < SEED_MEMBERS.length; i++) {
            const row = SEED_MEMBERS[i];
            const email = `ps.member${row.suffix}@example.com`;
            const avatarUrl = avatarUrlForIndex(i);
            let user = await userRepo.findOne({ where: { email } });
            let userId;
            if (!user) {
                userId = (0, uuid_util_1.generateUuid)();
                await userRepo.save(userRepo.create({
                    id: userId,
                    email,
                    fullName: row.fullName,
                    passwordHash: PASSWORD,
                    avatarUrl,
                    isEmailVerified: true,
                    isActive: true,
                }));
                console.log(`  Created user ${email} (${row.fullName})`);
            }
            else {
                userId = user.id;
                await userRepo.update(userId, {
                    fullName: row.fullName,
                    avatarUrl,
                    passwordHash: PASSWORD,
                    isEmailVerified: true,
                    isActive: true,
                });
                console.log(`  Updated user ${email} (avatar + password)`);
            }
            const existingMember = await orgMemberRepo.findOne({
                where: { organizationId: org.id, userId, status: 'ACTIVE' },
            });
            if (!existingMember) {
                await orgMemberRepo.save(orgMemberRepo.create({
                    id: (0, uuid_util_1.generateUuid)(),
                    organizationId: org.id,
                    userId,
                    role: 'member',
                    status: 'ACTIVE',
                }));
                console.log(`    → added to workspace as member`);
            }
            else {
                console.log(`    → already a member`);
            }
        }
    });
    await dataSource.destroy();
    console.log('\nDone. 10 members with avatars on Personal Solutions.');
    console.log('  Emails: ps.member01@example.com … ps.member10@example.com');
}
run().catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
});
//# sourceMappingURL=seed-personal-solutions-members.js.map