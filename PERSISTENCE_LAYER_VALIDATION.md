# Persistence Layer Validation Report

**Scope:** Entity-to-schema mapping integrity vs. finalized V1 MySQL migration (Flyway).  
**Rules:** No entity regeneration, no schema redesign; validation only.  
**Reference:** Migration script (V1__initial_schema.sql) — 19 tables, BINARY(16) UUIDs, InnoDB, FK/cascade as defined.

---

## 1. Entity-to-table alignment

### ✅ Confirmed correct

| Migration table | Entity | @Entity name | Notes |
|-----------------|--------|--------------|--------|
| users | UserEntity | 'users' | OK |
| organizations | OrganizationEntity | 'organizations' | OK |
| organization_members | OrganizationMemberEntity | 'organization_members' | OK |
| projects | ProjectEntity | 'projects' | OK |
| project_members | ProjectMemberEntity | 'project_members' | OK |
| workflows | WorkflowEntity | 'workflows' | OK |
| workflow_statuses | WorkflowStatusEntity | 'workflow_statuses' | OK |
| sprints | SprintEntity | 'sprints' | OK |
| tasks | TaskEntity | 'tasks' | OK |
| task_comments | TaskCommentEntity | 'task_comments' | OK |
| task_attachments | TaskAttachmentEntity | 'task_attachments' | OK |
| custom_fields | CustomFieldEntity | 'custom_fields' | OK |
| task_custom_field_values | TaskCustomFieldValueEntity | 'task_custom_field_values' | OK |
| notifications | NotificationEntity | 'notifications' | OK |
| plans | PlanEntity | 'plans' | OK |
| subscriptions | SubscriptionEntity | 'subscriptions' | OK |
| invoices | InvoiceEntity | 'invoices' | OK |
| payments | PaymentEntity | 'payments' | OK |
| activity_logs | ActivityLogEntity | 'activity_logs' | OK |

All 19 tables have a single corresponding entity; no extra or missing mappings. Table names match exactly.

---

## 2. Column mapping accuracy

### ✅ Confirmed correct (representative checks)

- **users:** full_name 150, email 150 unique, password_hash text nullable, avatar_url text nullable, is_email_verified/is_active booleans with defaults, created_at/updated_at (BaseEntity). Matches migration.
- **organizations:** name 150, slug 150 unique, owner_id BINARY(16), BaseEntity timestamps. Matches.
- **projects:** name 200, description text nullable, visibility 50 default 'PRIVATE', is_archived boolean default false, created_by BINARY(16), organization_id BINARY(16). Matches.
- **tasks:** title 300, description text nullable, priority 50 default 'MEDIUM', story_points int nullable, due_date date nullable, estimated_minutes int nullable, logged_minutes int default 0, all BINARY(16) FKs with transformer. Matches.
- **workflow_statuses:** name 100, position int, color 20 nullable, type 50. Matches.
- **plans:** name 100, price_per_user decimal(10,2) nullable, billing_cycle 50, max_projects/max_members int nullable, features json nullable, is_active default true, created_at only (no updated_at). Matches.
- **invoices:** amount decimal(10,2), status 50 default 'UNPAID', issued_at, paid_at nullable. Matches.
- **activity_logs:** entity_type 100, entity_id BINARY(16) nullable, action 100, metadata json nullable, created_at only. Matches.

Length/precision and defaults align with the migration. No redundant or missing columns identified.

### ⚠ Mapping warning

- **TypeORM decimal:** PlanEntity, InvoiceEntity, SubscriptionEntity use `type: 'decimal', precision: 10, scale: 2`. MySQL returns decimal as string; TypeORM/MySQL2 can return string. Entity types use `string` for amount/pricePerUser, which is correct for avoiding float drift. No change needed; just note that JSON/API serialization should keep these as string or formatted decimal.

---

## 3. Nullability & constraints

### ✅ Confirmed correct

- NOT NULL columns are mapped without `nullable: true` (e.g. users.full_name, tasks.title, workflow_statuses.type). Nullable columns use `nullable: true` (e.g. tasks.description, status_id, assignee_id, parent_task_id, sprint_id, due_date; notifications.title/message; activity_logs.user_id, entity_id).
- Single-column uniques reflected: users.email, organizations.slug with `unique: true`.

### ⚠ Mapping warnings (unique constraints)

Migration defines composite/unique constraints that are **not** reflected on the entities:

| Table | Migration constraint | Entity |
|-------|------------------------|--------|
| organization_members | UNIQUE(organization_id, user_id) | Not declared |
| project_members | UNIQUE(project_id, user_id) | Not declared |
| workflow_statuses | UNIQUE(workflow_id, position) | Not declared |
| task_custom_field_values | UNIQUE(task_id, custom_field_id) | Not declared |

**Impact:** Schema is enforced by the DB (migration); TypeORM will not create these indexes if `synchronize: true` is ever used. Application code can attempt duplicate inserts and get DB errors.  
**Recommendation:** Add `@Unique()` on the entity classes for documentation and future-proofing, e.g. `@Unique(['organizationId', 'userId'])` on OrganizationMemberEntity. Optional if schema is always managed by migrations and synchronize is false.

---

## 4. Relationship integrity

### ✅ Confirmed correct

- **Foreign keys:** All FKs are mapped with `@ManyToOne` and `@JoinColumn({ name: '...' })` with the correct column name. Referenced entities match the migration (users, organizations, projects, workflows, etc.).
- **Cascade behavior (aligned):** organization_members → org CASCADE, user CASCADE; projects → organization CASCADE, created_by RESTRICT; project_members → project CASCADE, user CASCADE; workflows → project CASCADE; workflow_statuses → workflow CASCADE; sprints → project CASCADE; task_comments → task CASCADE, user RESTRICT; task_attachments → task CASCADE, user RESTRICT; custom_fields → project CASCADE; task_custom_field_values → task CASCADE, custom_field CASCADE; notifications → user CASCADE; subscriptions → org CASCADE, plan RESTRICT; invoices → subscription CASCADE; payments → invoice CASCADE; activity_logs → org CASCADE.
- **Join columns:** Single-column FKs use a single `@JoinColumn`; no join tables in the schema, so no join-table configuration required.

### ❌ Critical schema misalignment — ON DELETE mismatch

Migration defines some FKs **without** ON DELETE (so MySQL defaults to **RESTRICT**). Entities use **SET NULL** for those same FKs. That can cause runtime errors when the parent row is deleted (DB rejects the delete; TypeORM metadata suggests nulling).

| Entity | Relation | Migration | Entity onDelete | Verdict |
|--------|----------|-----------|------------------|--------|
| ActivityLogEntity | user_id → users | No ON DELETE → RESTRICT | SET NULL | **Mismatch** |
| TaskEntity | status_id → workflow_statuses | No ON DELETE → RESTRICT | SET NULL | **Mismatch** |
| TaskEntity | assignee_id → users | No ON DELETE → RESTRICT | SET NULL | **Mismatch** |
| TaskEntity | parent_task_id → tasks | No ON DELETE → RESTRICT | SET NULL | **Mismatch** |
| TaskEntity | sprint_id → sprints | No ON DELETE → RESTRICT | SET NULL | **Mismatch** |

**Impact:** Deleting a user (with activity_logs), a workflow_status (referenced by tasks), or a sprint (referenced by tasks) will be **rejected by the DB** with a foreign key error. The entity metadata does not match DB behavior and can mislead developers.  
**Recommendation:** Align entity `onDelete` with the migration. For the above, set `onDelete: 'RESTRICT'` so TypeORM metadata matches the DB. If the intended behavior is SET NULL, update the migration to `ON DELETE SET NULL` and keep the entity as-is.

### ⚠ Composite foreign key (tasks → projects)

Migration:

```sql
ADD CONSTRAINT fk_task_project_org
  FOREIGN KEY (project_id, organization_id)
  REFERENCES projects(id, organization_id) ON DELETE CASCADE
```

The entity maps only `project_id` for the relation:

```ts
@ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'project_id' })
project?: ProjectEntity;
```

**Impact:** The DB enforces that `(task.project_id, task.organization_id)` must exist in `projects(id, organization_id)`. TypeORM’s relation is single-column; it does not model the composite FK. For loading `task.project` by `project_id` this is correct. If schema is created by migrations (not `synchronize`), the composite FK exists in the DB.  
**Recommendation:** Leave as-is if schema is migration-managed. Document that the composite FK exists in the DB. If you ever use TypeORM migrations/sync, add a composite join or ensure the migration is the single source of truth for this FK.

---

## 5. Identifier handling

### ✅ Confirmed correct

- **Primary keys:** All 19 entities use `@PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })` for `id`, matching migration `id BINARY(16) PRIMARY KEY`.
- **UUID handling:** `uuidBinaryTransformer` (common/base.entity.ts) converts string UUID ↔ BINARY(16) for read/write. No DB-side default (no UUID()); IDs are set in application code (repositories use `generateUuid()` before insert). Aligned with migration and current design.
- **Other BINARY(16) columns:** All FK and UUID-like columns (e.g. organization_id, user_id, project_id, status_id, entity_id) use the same transformer and type. Consistent.

No redundant or incorrect generation strategy; no mismatch with the migration.

---

## 6. Runtime ORM risks

### ✅ Confirmed correct

- **No eager loading in repositories:** No `relations: [...]` or `eager: true` in entity definitions. Lists are loaded without relations by default, so no accidental large eager graphs.
- **Cascade deletes:** CASCADE is used only where the migration specifies it (child tables: members, comments, attachments, etc.). No CASCADE on a parent that would delete more than intended.
- **Lazy loading:** Relations are lazy. Accessing `task.project` or `task.assignee` triggers a query when first accessed. This is expected and controllable.

### ⚠ N+1 query risk

- **Risk:** If a list endpoint (e.g. tasks by project) returns entities and then, in a loop or in a serializer, accesses a relation (e.g. `task.assignee` or `task.project`) for each item, N+1 queries will occur.
- **Current state:** TasksRepository.findByProject and similar list methods do not pass `relations`. DTOs typically expose only ids (assigneeId, projectId), not nested objects, so N+1 may not be triggered yet.
- **Recommendation:** When adding nested data to list responses, either (1) pass `relations: ['assignee', 'project']` (or equivalent) in the repository find, or (2) use QueryBuilder with leftJoinAndSelect so one query loads the list and relations. Avoid looping and accessing a relation per entity without preloading.

### ⚠ Lazy-loading in non-request context

- **Risk:** If entities are passed to queues, workers, or serializers that access relations after the request scope (and the connection) is closed, lazy loading can throw or behave incorrectly.
- **Recommendation:** In such code paths, load relations explicitly in the service (e.g. find with `relations`) or use a DTO that already contains the needed data, and do not rely on lazy access outside the request.

---

## Summary

| Area | Status | Notes |
|------|--------|--------|
| Entity–table alignment | ✅ | 19/19 tables mapped; names match. |
| Column mapping | ✅ | Names, types, lengths, defaults match migration. |
| Nullability | ✅ | NOT NULL / nullable aligned. |
| Unique (single-column) | ✅ | email, slug have unique. |
| Unique (composite) | ⚠ | Four composite uniques not on entities; optional @Unique for docs/sync. |
| FKs and cascade (most) | ✅ | Most FKs and cascade match migration. |
| ON DELETE (activity_logs, tasks) | ❌ | Five relations use SET NULL in entity but RESTRICT in DB; align with migration or change migration. |
| Composite FK (tasks → projects) | ⚠ | DB has composite FK; entity has single-column join; acceptable if schema is migration-managed. |
| Identifier / UUID | ✅ | BINARY(16) + transformer; app-generated IDs. |
| N+1 / eager | ⚠ | No eager in repos; N+1 possible if list endpoints add relation access without preload. |
| Cascade delete safety | ✅ | No dangerous extra CASCADE. |

---

## Corrective recommendations (concise)

1. **Critical — ON DELETE alignment**  
   In **ActivityLogEntity** (user relation) and **TaskEntity** (status, assignee, parentTask, sprint relations), set `onDelete: 'RESTRICT'` to match the migration (FKs with no ON DELETE). Alternatively, change the migration to `ON DELETE SET NULL` for those columns and keep the entity as-is.

2. **Optional — Composite uniques**  
   Add `@Unique(['organizationId', 'userId'])` on OrganizationMemberEntity, `@Unique(['projectId', 'userId'])` on ProjectMemberEntity, `@Unique(['workflowId', 'position'])` on WorkflowStatusEntity, and `@Unique(['taskId', 'customFieldId'])` on TaskCustomFieldValueEntity for documentation and any future use of sync.

3. **Optional — N+1 prevention**  
   When exposing nested objects in list APIs, load relations in the repository (e.g. `relations: ['assignee','project']`) or via QueryBuilder in a single query; avoid per-entity lazy access in loops.

4. **Documentation**  
   Document that the tasks → projects composite FK exists in the DB and is not fully expressed in TypeORM’s relation; schema should remain migration-driven.

---

*Validation is against the V1 migration schema only. No entities or schema were regenerated or redesigned.*
