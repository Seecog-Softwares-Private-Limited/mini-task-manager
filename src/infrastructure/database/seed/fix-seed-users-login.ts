/**
 * Fixes seed users so they can log in:
 * - Sets is_email_verified = true
 * - Resets password_hash to bcrypt hash of SEED_USER_PASSWORD or Password123!
 *
 * Run: npm run seed:fix-login (from repo root)
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'properties.env') });

import { DataSource } from 'typeorm';
import { configuration } from '../../../config/configuration';
import { UserEntity } from '../../../modules/users/entities/user.entity';
import { hashPassword } from '../../../modules/users/password-storage.util';

const SEED_EMAILS = ['owner@example.com', 'member@example.com', 'admin@example.com'] as const;
const PASSWORD = process.env.SEED_USER_PASSWORD || 'Password123!';

async function main() {
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
  });

  await dataSource.initialize();
  const repo = dataSource.getRepository(UserEntity);
  const passwordHash = await hashPassword(PASSWORD);

  for (const email of SEED_EMAILS) {
    const user = await repo.findOne({ where: { email } });
    if (!user) {
      console.log(`  Skip (not found): ${email}`);
      continue;
    }
    await repo.update(user.id, { passwordHash, isEmailVerified: true });
    console.log(`  Updated: ${email} (verified + password reset)`);
  }

  await dataSource.destroy();
  console.log('\nDone. Use SEED_USER_PASSWORD from properties.env, or Password123! if unset.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
