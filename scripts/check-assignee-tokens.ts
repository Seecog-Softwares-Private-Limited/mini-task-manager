import '../src/bootstrap-env';
import { DataSource } from 'typeorm';

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

  const vinik = await ds.query(
    `SELECT u.email,
            (SELECT COUNT(*) FROM device_tokens dt WHERE dt.user_id = u.id) AS token_count,
            (SELECT COUNT(*) FROM notifications n WHERE n.user_id = u.id AND n.title LIKE 'Task assigned%') AS task_assign_notifs
     FROM users u
     WHERE u.email LIKE '%vinik%' OR u.email LIKE '%pintu%' OR u.email LIKE '%pankaj%'
     LIMIT 10`,
  );

  const recentTaskAssigned = await ds.query(
    `SELECT u.email, n.title, n.created_at
     FROM notifications n
     JOIN users u ON u.id = n.user_id
     WHERE n.title LIKE 'Task assigned%'
     ORDER BY n.created_at DESC
     LIMIT 10`,
  );

  console.log(JSON.stringify({ vinik, recentTaskAssigned }, null, 2));
  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
