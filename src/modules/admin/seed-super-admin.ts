import dataSource from '../../infrastructure/database/data-source';
import { hashPassword } from '../users/password-storage.util';

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com')
  .toLowerCase()
  .trim();
const SUPER_ADMIN_PASSWORD = process.env.SEED_USER_PASSWORD || 'Password123!';

async function main() {
  await dataSource.initialize();
  try {
    const passwordHash = await hashPassword(SUPER_ADMIN_PASSWORD);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BINARY(16) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY ux_super_admins_user_id (user_id),
        PRIMARY KEY (id)
      )
    `);
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        setting_key VARCHAR(120) NOT NULL,
        setting_value JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY ux_platform_settings_key (setting_key),
        PRIMARY KEY (id)
      )
    `);

    await dataSource.query(
      `
        INSERT INTO users (
          id,
          full_name,
          email,
          password_hash,
          is_email_verified,
          is_active,
          is_platform_admin
        )
        SELECT
          UUID_TO_BIN(UUID()),
          'Super Admin',
          ?,
          ?,
          1,
          1,
          1
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM users WHERE email = ?
        )
      `,
      [SUPER_ADMIN_EMAIL, passwordHash, SUPER_ADMIN_EMAIL],
    );

    await dataSource.query(
      `
        UPDATE users
        SET
          is_platform_admin = 1,
          is_active = 1,
          is_email_verified = 1,
          password_hash = ?
        WHERE email = ?
      `,
      [passwordHash, SUPER_ADMIN_EMAIL],
    );

    await dataSource.query(`
      INSERT INTO super_admins (user_id, is_active)
      SELECT id, 1 FROM users WHERE is_platform_admin = 1
      ON DUPLICATE KEY UPDATE is_active = VALUES(is_active)
    `);

    await dataSource.query(`
      INSERT INTO platform_settings (setting_key, setting_value)
      VALUES
        ('platform_name', JSON_OBJECT('value', 'OpsPick')),
        ('registration', JSON_OBJECT('enabled', true)),
        ('security', JSON_OBJECT('mfaRequired', false)),
        ('smtp', JSON_OBJECT('configured', false)),
        ('storage', JSON_OBJECT('provider', 'local')),
        ('payment_gateway', JSON_OBJECT('provider', 'razorpay'))
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `);
    // eslint-disable-next-line no-console
    console.log(`Super admin seed complete for: ${SUPER_ADMIN_EMAIL}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
