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

  const recent = await ds.query(
    `SELECT title, LEFT(message, 80) AS msg, created_at
     FROM notifications
     WHERE title LIKE '%assigned%' OR title LIKE '%Subtask%'
     ORDER BY created_at DESC
     LIMIT 8`,
  );
  const counts = await ds.query(
    'SELECT platform, COUNT(*) AS c FROM device_tokens GROUP BY platform',
  );
  const usersWithTokens = await ds.query(
    `SELECT dt.platform, u.email
     FROM device_tokens dt
     JOIN users u ON u.id = dt.user_id`,
  );

  console.log(JSON.stringify({ recent, counts, usersWithTokens }, null, 2));
  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
