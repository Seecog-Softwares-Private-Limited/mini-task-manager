/**
 * Upserts App Store review demo account.
 * Run: npm run seed:app-review
 *
 * Login: test@test.com / Test123$
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'properties.env') });

import { DataSource } from 'typeorm';
import { configuration } from '../../../config/configuration';
import { generateUuid } from '../../../common/utils/uuid.util';
import { hashPassword } from '../../../modules/users/password-storage.util';
import { UserEntity } from '../../../modules/users/entities/user.entity';
import { OrganizationEntity } from '../../../modules/organizations/entities/organization.entity';
import { OrganizationMemberEntity } from '../../../modules/organizations/entities/organization-member.entity';

const EMAIL = 'test@test.com';
const PASSWORD = 'Test123$';
const FULL_NAME = 'App Review Tester';

async function seedAppReviewUser() {
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
    logging: false,
  });

  await dataSource.initialize();
  console.log(`Connected to ${dbConfig.host}/${dbConfig.database}`);

  const userRepo = dataSource.getRepository(UserEntity);
  const orgRepo = dataSource.getRepository(OrganizationEntity);
  const orgMemberRepo = dataSource.getRepository(OrganizationMemberEntity);

  const passwordHash = await hashPassword(PASSWORD);
  const email = EMAIL.toLowerCase();

  let user = await userRepo.findOne({ where: { email } });
  if (!user) {
    user = await userRepo.save(
      userRepo.create({
        id: generateUuid(),
        email,
        fullName: FULL_NAME,
        passwordHash,
        isEmailVerified: true,
        isActive: true,
        onboardingCompletedAt: new Date(),
      }),
    );
    console.log(`Created user ${email}`);
  } else {
    await userRepo.update(user.id, {
      fullName: FULL_NAME,
      passwordHash,
      isEmailVerified: true,
      isActive: true,
      onboardingCompletedAt: user.onboardingCompletedAt ?? new Date(),
    });
    user = (await userRepo.findOne({ where: { id: user.id } }))!;
    console.log(`Updated user ${email}`);
  }

  const memberships = await orgMemberRepo.find({
    where: { userId: user.id, status: 'ACTIVE' },
  });

  if (memberships.length === 0) {
    const orgId = generateUuid();
    const slug = `app-review-${user.id.replace(/-/g, '').slice(0, 10)}`;
    await orgRepo.save(
      orgRepo.create({
        id: orgId,
        name: 'App Review Workspace',
        slug,
        ownerId: user.id,
      }),
    );
    await orgMemberRepo.save(
      orgMemberRepo.create({
        id: generateUuid(),
        organizationId: orgId,
        userId: user.id,
        role: 'owner',
        status: 'ACTIVE',
      }),
    );
    console.log('Created App Review Workspace (owner)');
  } else {
    console.log(`User already in ${memberships.length} workspace(s)`);
  }

  await dataSource.destroy();
  console.log('\nApp Review credentials ready:');
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
}

seedAppReviewUser().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
