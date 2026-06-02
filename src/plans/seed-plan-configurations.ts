import { DataSource } from 'typeorm';
import dataSource from '../infrastructure/database/data-source';

async function seed(ds: DataSource) {
  await ds.query(`
    INSERT INTO \`plan_configurations\` (\`plan_name\`, \`max_users\`, \`max_storage\`, \`max_workspaces\`)
    VALUES
      ('free', 5, 524288000, 1),
      ('silver', 20, 2147483648, 1),
      ('gold', NULL, 4294967296, 10)
    ON DUPLICATE KEY UPDATE
      \`max_users\` = VALUES(\`max_users\`),
      \`max_storage\` = VALUES(\`max_storage\`),
      \`max_workspaces\` = VALUES(\`max_workspaces\`)
  `);
}

async function main() {
  const ds = dataSource;
  await ds.initialize();
  try {
    await seed(ds);
    // eslint-disable-next-line no-console
    console.log('Plan configurations seeded successfully');
  } finally {
    await ds.destroy();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

