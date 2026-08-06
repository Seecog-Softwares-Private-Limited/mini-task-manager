/**
 * One-time cleanup: drop excess FCM tokens so each user keeps at most 2 per platform.
 *
 *   npx ts-node -r tsconfig-paths/register scripts/prune-device-tokens.ts
 */
import { DataSource } from 'typeorm';
import '../src/bootstrap-env';

const MAX_PER_PLATFORM = 2;

async function main(): Promise<void> {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE || 'mini_task_manager',
  });
  await ds.initialize();

  const users: Array<{ user_id: Buffer }> = await ds.query(
    'SELECT DISTINCT user_id FROM device_tokens',
  );

  let deleted = 0;
  for (const row of users) {
    const tokens: Array<{
      id: Buffer;
      platform: string;
      updated_at: Date;
    }> = await ds.query(
      `SELECT id, platform, updated_at
       FROM device_tokens
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
      [row.user_id],
    );

    const keep = new Set<string>();
    const countByPlatform = new Map<string, number>();
    for (const t of tokens) {
      const platform = (t.platform || 'unknown').toLowerCase();
      const used = countByPlatform.get(platform) ?? 0;
      if (used < MAX_PER_PLATFORM) {
        keep.add(t.id.toString('hex'));
        countByPlatform.set(platform, used + 1);
      }
    }

    for (const t of tokens) {
      const hex = t.id.toString('hex');
      if (keep.has(hex)) continue;
      await ds.query('DELETE FROM device_tokens WHERE id = ?', [t.id]);
      deleted += 1;
    }
  }

  const remaining: Array<{ c: number }> = await ds.query(
    'SELECT COUNT(*) AS c FROM device_tokens',
  );
  console.log(`Pruned ${deleted} stale token(s). Remaining: ${remaining[0]?.c ?? '?'}`);
  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
