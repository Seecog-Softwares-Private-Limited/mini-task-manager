/**
 * Adds an invited user so they can login and accept their invitation.
 * Usage: npx ts-node -r tsconfig-paths/register src/infrastructure/database/seed/add-invited-user.ts
 *
 * Edit EMAIL and PASSWORD below, then run: npm run seed:add-invited-user
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { configuration } from '../../../config/configuration';
import { generateUuid } from '../../../common/utils/uuid.util';
import { UserEntity } from '../../../modules/users/entities/user.entity';

const EMAIL = 'pankaj.7613@gmail.com';
const PASSWORD = 'Password123!';

async function addUser() {
  const dbConfig = configuration().database;
  const dataSource = new DataSource({
    type: 'mysql',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    entities: [UserEntity],
    synchronize: false,
    logging: dbConfig.logging ?? false,
  });

  await dataSource.initialize();
  console.log(`Adding user: ${EMAIL}`);

  const hash = await bcrypt.hash(PASSWORD, 10);
  const userRepo = dataSource.getRepository(UserEntity);

  const existing = await userRepo.findOne({ where: { email: EMAIL.toLowerCase() } });
  if (existing) {
    console.log(`User ${EMAIL} already exists. You can login with this email.`);
    await dataSource.destroy();
    return;
  }

  await userRepo.save(
    userRepo.create({
      id: generateUuid(),
      email: EMAIL.toLowerCase(),
      fullName: EMAIL.split('@')[0],
      passwordHash: hash,
    }),
  );

  await dataSource.destroy();
  console.log(`\nUser created. Login with:`);
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`\nThen open your invitation link and click "Accept Invitation".`);
}

addUser().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
