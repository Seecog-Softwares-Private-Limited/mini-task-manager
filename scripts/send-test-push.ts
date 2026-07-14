/**
 * Send a test FCM push to every row in device_tokens.
 *
 * Usage (from repo root):
 *   npx ts-node -r tsconfig-paths/register scripts/send-test-push.ts
 *
 * Optional: only one platform
 *   npx ts-node -r tsconfig-paths/register scripts/send-test-push.ts android
 *   npx ts-node -r tsconfig-paths/register scripts/send-test-push.ts ios
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { DataSource } from 'typeorm';
import '../src/bootstrap-env';

  const platformFilter = (process.argv[2] || '').toLowerCase();
  if (platformFilter && platformFilter !== 'android' && platformFilter !== 'ios') {
    console.error('Usage: send-test-push.ts [android|ios]');
    process.exit(1);
  }

  const saPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    join(process.cwd(), 'config', 'firebase-service-account.json');
  if (!existsSync(saPath)) {
    console.error(`Missing Firebase service account at ${saPath}`);
    process.exit(1);
  }
  if (getApps().length === 0) {
    const credential = JSON.parse(readFileSync(saPath, 'utf8')) as ServiceAccount;
    initializeApp({ credential: cert(credential) });
  }

  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE || 'mini_task_manager',
  });
  await ds.initialize();

  const rows: Array<{ token: string; platform: string; user_id: Buffer }> = await ds.query(
    platformFilter
      ? `SELECT token, platform, user_id FROM device_tokens WHERE platform = ?`
      : `SELECT token, platform, user_id FROM device_tokens`,
    platformFilter ? [platformFilter] : [],
  );

  console.log(`Found ${rows.length} device token(s)${platformFilter ? ` (${platformFilter})` : ''}.`);
  if (rows.length === 0) {
    console.log('No tokens. Log in on the Flutter Android/iOS app first, then retry.');
    await ds.destroy();
    process.exit(0);
  }

  const messaging = getMessaging();
  let ok = 0;
  let fail = 0;

  for (const row of rows) {
    try {
      const id = await messaging.send({
        token: row.token,
        notification: {
          title: 'Test push',
          body: `Mini Task Manager test (${row.platform}) — app can be closed.`,
        },
        data: {
          open: 'alerts',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: { priority: 'high' },
        apns: {
          payload: {
            aps: { sound: 'default', badge: 1 },
          },
        },
      });
      ok += 1;
      console.log(`OK  [${row.platform}] ${row.token.slice(0, 18)}… → ${id}`);
    } catch (err) {
      fail += 1;
      console.error(
        `FAIL [${row.platform}] ${row.token.slice(0, 18)}… → ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  console.log(`Done. success=${ok} failed=${fail}`);
  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
