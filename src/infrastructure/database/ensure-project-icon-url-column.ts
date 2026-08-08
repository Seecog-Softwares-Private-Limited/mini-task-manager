/**
 * Adds `projects.icon_url` if missing (same as migration AddProjectIconUrl).
 * Use when GET /api/v1/projects returns 500 and logs show Unknown column 'icon_url'.
 *
 * Run: npm run db:ensure-project-icon-url
 */
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

import dataSource from './data-source';

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    const rows = (await dataSource.query(
      `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'icon_url'`,
    )) as { c: number | string }[];
    const c = Number(rows[0]?.c ?? 0);
    if (c > 0) {
      console.log('OK: projects.icon_url already exists.');
      return;
    }
    await dataSource.query(
      'ALTER TABLE `projects` ADD COLUMN `icon_url` MEDIUMTEXT NULL AFTER `description`',
    );
    console.log('OK: Added column projects.icon_url. Restart the API and retry.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
