/**
 * One-time migration: hash plain-text passwords in users.password_hash with bcrypt.
 *
 * Run from repo root:
 *   npm run migrate:passwords
 *
 * Skips rows that already look like bcrypt ($2a$ / $2b$ / $2y$).
 */
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

import dataSource from '../src/infrastructure/database/data-source';
import {
  hashPassword,
  isAlreadyHashed,
} from '../src/modules/users/password-storage.util';

interface UserRow {
  id: Buffer;
  email: string;
  password_hash: string | null;
}

async function main(): Promise<void> {
  await dataSource.initialize();

  try {
    const rows = (await dataSource.query(
      `SELECT id, email, password_hash FROM users WHERE password_hash IS NOT NULL AND password_hash != ''`,
    )) as UserRow[];

    if (rows.length === 0) {
      console.log('No users with passwords found.');
      return;
    }

    let migrated = 0;
    let skipped = 0;

    for (const row of rows) {
      const email = row.email;
      const stored = row.password_hash;
      if (!stored) {
        console.log(`⏭️  Skipped: ${email} (empty password)`);
        skipped++;
        continue;
      }

      if (isAlreadyHashed(stored)) {
        console.log(`⏭️  Skipped: ${email} (already hashed)`);
        skipped++;
        continue;
      }

      const hashed = await hashPassword(stored);
      await dataSource.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [
        hashed,
        row.id,
      ]);
      console.log(`✅ Migrated: ${email}`);
      migrated++;
    }

    console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
