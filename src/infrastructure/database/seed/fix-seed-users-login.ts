/**
 * Fixes seed users so they can log in:
 * - Sets is_email_verified = true (required by auth; login is blocked if false)
 * - Resets password (plain text in password_hash) to SEED_USER_PASSWORD or Password123!
 *
 * Run: npm run seed:fix-login (from repo root)
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), 'properties.env') });

import { DataSource } from 'typeorm';
import { configuration } from '../../../config/configuration';
import { UserEntity } from '../../../modules/users/entities/user.entity';

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

  for (const email of SEED_EMAILS) {
    const user = await repo.findOne({ where: { email } });
    if (!user) {
      console.log(`  Skip (not found): ${email}`);
      continue;
    }
    await repo.update(user.id, {
      passwordHash: PASSWORD,
      isEmailVerified: true,
    });
    console.log(`  Updated: ${email} (verified + password from SEED_USER_PASSWORD or default)`);
  }

  await dataSource.destroy();
  console.log('\nDone. Login with any of:', SEED_EMAILS.join(', '));
  console.log(`Password: ${PASSWORD === 'Password123!' ? 'Password123! (default)' : '(value of SEED_USER_PASSWORD in properties.env)'}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
