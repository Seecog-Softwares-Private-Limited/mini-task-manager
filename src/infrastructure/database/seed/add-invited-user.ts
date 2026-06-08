/**
 * Adds an invited user so they can login and accept their invitation.
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'properties.env') });

import { DataSource } from 'typeorm';
import { configuration } from '../../../config/configuration';
import { generateUuid } from '../../../common/utils/uuid.util';
import { UserEntity } from '../../../modules/users/entities/user.entity';
import { hashPassword } from '../../../modules/users/password-storage.util';

const EMAIL = process.env.SEED_INVITED_EMAIL || 'invitee@example.com';
const PASSWORD = process.env.SEED_USER_PASSWORD || 'Password123!';

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

  const userRepo = dataSource.getRepository(UserEntity);

  const existing = await userRepo.findOne({ where: { email: EMAIL.toLowerCase() } });
  if (existing) {
    console.log(`User ${EMAIL} already exists. You can login with this email.`);
    await dataSource.destroy();
    return;
  }

  const passwordHash = await hashPassword(PASSWORD);

  await userRepo.save(
    userRepo.create({
      id: generateUuid(),
      email: EMAIL.toLowerCase(),
      fullName: EMAIL.split('@')[0],
      passwordHash,
    }),
  );

  await dataSource.destroy();
  console.log(`\nUser created. Login with email ${EMAIL} and SEED_USER_PASSWORD (or Password123! if unset).`);
}

addUser().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
