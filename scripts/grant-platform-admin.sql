-- Grant platform admin to an existing user (run after migration 1760000022000).
-- Replace the email with your account.
UPDATE users SET is_platform_admin = 1 WHERE email = 'admin@example.com';
