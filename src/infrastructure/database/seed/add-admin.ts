/**
 * Adds admin user and project ADMIN role to existing seed data.
 * Run when you already have seed data and need superadmin@example.com to send invites.
 * Usage: npx ts-node -r tsconfig-paths/register src/infrastructure/database/seed/add-admin.ts
 * Loads env from properties.env at repo root.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'properties.env') });

import { DataSource } from 'typeorm';
import { configuration } from '../../../config/configuration';
import { generateUuid } from '../../../common/utils/uuid.util';
import { UserEntity } from '../../../modules/users/entities/user.entity';
import { OrganizationMemberEntity } from '../../../modules/organizations/entities/organization-member.entity';
import { ProjectMemberEntity } from '../../../modules/projects/entities/project-member.entity';
import { OrganizationEntity } from '../../../modules/organizations/entities/organization.entity';
import { ProjectEntity } from '../../../modules/projects/entities/project.entity';

const ADMIN_EMAIL = 'superadmin@example.com';
const PASSWORD = process.env.SEED_USER_PASSWORD || 'Password123!';

async function addAdmin() {
  const dbConfig = configuration().database;
  const dataSource = new DataSource({
    type: 'mysql',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    entities: [
      UserEntity,
      OrganizationEntity,
      OrganizationMemberEntity,
      ProjectEntity,
      ProjectMemberEntity,
    ],
    synchronize: false,
    logging: dbConfig.logging ?? false,
  });

  await dataSource.initialize();
  console.log('Database connected. Adding admin...');

  await dataSource.transaction(async (manager) => {
    const userRepo = manager.getRepository(UserEntity);
    const orgRepo = manager.getRepository(OrganizationEntity);
    const orgMemberRepo = manager.getRepository(OrganizationMemberEntity);
    const projectRepo = manager.getRepository(ProjectEntity);
    const projectMemberRepo = manager.getRepository(ProjectMemberEntity);

    let admin = await userRepo.findOne({ where: { email: ADMIN_EMAIL } });
    let adminId: string;
    if (!admin) {
      adminId = generateUuid();
      await userRepo.save(
        userRepo.create({
          id: adminId,
          email: ADMIN_EMAIL,
          fullName: 'Seed Admin',
          passwordHash: PASSWORD,
        }),
      );
      console.log('  Created user: superadmin@example.com');
    } else {
      adminId = admin.id;
      console.log('  User superadmin@example.com already exists');
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
      await orgMemberRepo.save(
        orgMemberRepo.create({
          id: generateUuid(),
          organizationId: seedOrg.id,
          userId: adminId,
          role: 'admin',
          status: 'ACTIVE',
        }),
      );
      console.log('  Added admin to organization: Seed Org');
    } else {
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
        await projectMemberRepo.save(
          projectMemberRepo.create({
            id: generateUuid(),
            projectId: project.id,
            userId: adminId,
            role: 'ADMIN',
          }),
        );
        console.log(`  Added admin to project: ${project.name} (ADMIN role)`);
      }
    }
  });

  await dataSource.destroy();
  console.log('\nDone. Login with superadmin@example.com / Password123!');
  console.log('Select "Seed Org" and open a project to see the Invite button.');
}

addAdmin().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
