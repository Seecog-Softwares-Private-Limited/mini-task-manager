/**
 * Adds 10 workspace members with profile images to "Personal Solutions"
 * (matches by name case-insensitively, or slug `personal-solutions`, or ORG_SLUG env).
 *
 * Usage (repo root):
 *   npm run seed:personal-solutions-members
 *
 * Login for each seeded member (same password as other seeds):
 *   ps.member01@example.com … ps.member10@example.com  /  Password123!  (or SEED_USER_PASSWORD)
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { DataSource, Repository } from 'typeorm';
import { configuration } from '../../../config/configuration';
import { generateUuid } from '../../../common/utils/uuid.util';
import { hashPassword } from '../../../modules/users/password-storage.util';
import { UserEntity } from '../../../modules/users/entities/user.entity';
import { OrganizationEntity } from '../../../modules/organizations/entities/organization.entity';
import { OrganizationMemberEntity } from '../../../modules/organizations/entities/organization-member.entity';

const PASSWORD = process.env.SEED_USER_PASSWORD || 'Password123!';

/** Stable portrait URLs (i.pravatar.cc — distinct faces per index). */
function avatarUrlForIndex(i: number): string {
  const img = 10 + i; // use img=11..20 to avoid tiny overlap with defaults
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
] as const;

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function findTargetOrg(orgRepo: Repository<OrganizationEntity>): Promise<OrganizationEntity | null> {
  const envSlug = process.env.ORG_SLUG?.trim().toLowerCase();
  const all = await orgRepo.find();
  if (envSlug) {
    const bySlug = all.find((o) => o.slug?.toLowerCase() === envSlug);
    if (bySlug) return bySlug;
  }
  const target = normalizeName('Personal Solutions');
  return (
    all.find((o) => normalizeName(o.name) === target) ??
    all.find((o) => o.slug?.toLowerCase() === 'personal-solutions') ??
    null
  );
}

async function run() {
  const dbConfig = configuration().database;
  const dataSource = new DataSource({
    type: 'mysql',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    entities: [UserEntity, OrganizationEntity, OrganizationMemberEntity],
    synchronize: false,
    logging: dbConfig.logging ?? false,
  });

  await dataSource.initialize();
  console.log('Database connected. Seeding Personal Solutions members...');

  const passwordHash = await hashPassword(PASSWORD);

  await dataSource.transaction(async (manager) => {
    const userRepo = manager.getRepository(UserEntity);
    const orgRepo = manager.getRepository(OrganizationEntity);
    const orgMemberRepo = manager.getRepository(OrganizationMemberEntity);

    const org = await findTargetOrg(orgRepo);
    if (!org) {
      throw new Error(
        'Workspace not found. Create a workspace named "Personal Solutions" (slug personal-solutions) first, ' +
          'or set ORG_SLUG to an existing organization slug.'
      );
    }

    console.log(`  Target workspace: "${org.name}" (${org.slug})`);

    for (let i = 0; i < SEED_MEMBERS.length; i++) {
      const row = SEED_MEMBERS[i];
      const email = `ps.member${row.suffix}@example.com`;
      const avatarUrl = avatarUrlForIndex(i);

      let user = await userRepo.findOne({ where: { email } });
      /** Always use this for FK inserts — `save()` can return a malformed `id` for BINARY(16) UUIDs in some TypeORM/MySQL setups. */
      let userId: string;

      if (!user) {
        userId = generateUuid();
        await userRepo.save(
          userRepo.create({
            id: userId,
            email,
            fullName: row.fullName,
            passwordHash,
            avatarUrl,
            isEmailVerified: true,
            isActive: true,
          }),
        );
        console.log(`  Created user ${email} (${row.fullName})`);
      } else {
        userId = user.id;
        await userRepo.update(userId, {
          fullName: row.fullName,
          avatarUrl,
          passwordHash,
          isEmailVerified: true,
          isActive: true,
        });
        console.log(`  Updated user ${email} (avatar + password)`);
      }

      const existingMember = await orgMemberRepo.findOne({
        where: { organizationId: org.id, userId, status: 'ACTIVE' },
      });
      if (!existingMember) {
        await orgMemberRepo.save(
          orgMemberRepo.create({
            id: generateUuid(),
            organizationId: org.id,
            userId,
            role: 'member',
            status: 'ACTIVE',
          }),
        );
        console.log(`    → added to workspace as member`);
      } else {
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
