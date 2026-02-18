-- Scalability indexes for multi-tenant and high-growth tables.
-- Run manually if not using TypeORM migrations, or use as reference.
-- MySQL 8.0; column names match schema (snake_case in DB, BINARY(16) for UUIDs).

-- activity_logs: paginated audit by org
CREATE INDEX idx_activity_logs_org_created ON activity_logs (organization_id, created_at DESC);

-- tasks: paginated by project, find by org+id
CREATE INDEX idx_tasks_project_created ON tasks (project_id, created_at DESC);
CREATE INDEX idx_tasks_org_id ON tasks (organization_id, id);

-- notifications: paginated by user
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);

-- organization_members: TenantGuard lookup
CREATE INDEX idx_org_members_org_user_status ON organization_members (organization_id, user_id, status);

-- projects: list by org and archived flag
CREATE INDEX idx_projects_org_archived ON projects (organization_id, is_archived);

-- subscriptions: lookup by org
CREATE INDEX idx_subscriptions_organization_id ON subscriptions (organization_id);
