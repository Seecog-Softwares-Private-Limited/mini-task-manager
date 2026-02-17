# TypeORM + Jest Entity Type Fix

## Root cause

Under **Jest** (ts-jest), TypeORM builds entity metadata using **reflect-metadata**. When a `@Column()` does **not** specify an explicit `type`, TypeORM falls back to the **design type** of the property (from TypeScript reflection).

- For **plain `string`**, the emitted design type is often `String`, which TypeORM maps to a string column.
- For **union types** such as `string | null` (and in some ts-jest/emit setups, even plain `string`), the reflected type can be **`Object`**.
- TypeORM then tries to use `"Object"` as the MySQL column type, which MySQL does not support → **`DataTypeNotSupportedError: Data type "Object" in "...Entity.column" is not supported by "mysql" database`**.

The application builds and runs outside Jest because `tsc` (or the Nest build pipeline) can emit different metadata than ts-jest, so the problem appears only when entities are loaded in the Jest environment.

## Entity columns that were missing explicit type

Any `@Column` that had **only** `length` (and optionally `nullable` / `default`) and **no** `type` was relying on inference. Under Jest, that inference can yield `Object` for string (and especially `string | null`) properties. Boolean properties with only `default: true/false` can behave similarly.

The following entities were updated so that **every such column** has an explicit type:

| Entity file | Columns corrected |
|-------------|-------------------|
| `workflow-status.entity.ts` | `name`, `color`, `type` → `type: 'varchar'` |
| `task-attachment.entity.ts` | `fileName` → `type: 'varchar'` |
| `notification.entity.ts` | `title` → `type: 'varchar'`, `isRead` → `type: 'boolean'` |
| `activity-log.entity.ts` | `entityType`, `action` → `type: 'varchar'` |
| `payment.entity.ts` | `paymentGateway`, `transactionId`, `status` → `type: 'varchar'` |
| `invoice.entity.ts` | `status` → `type: 'varchar'` |
| `plan.entity.ts` | `name`, `billingCycle` → `type: 'varchar'`, `isActive` → `type: 'boolean'` |
| `subscription.entity.ts` | `status` → `type: 'varchar'` |
| `custom-field.entity.ts` | `name`, `fieldType` → `type: 'varchar'`, `isRequired` → `type: 'boolean'` |
| `sprint.entity.ts` | `name`, `status` → `type: 'varchar'` |
| `workflow.entity.ts` | `name` → `type: 'varchar'`, `isDefault` → `type: 'boolean'` |
| `project.entity.ts` | `name`, `visibility` → `type: 'varchar'`, `isArchived` → `type: 'boolean'` |
| `project-member.entity.ts` | `role` → `type: 'varchar'` |
| `organization-member.entity.ts` | `role`, `status` → `type: 'varchar'` |
| `organization.entity.ts` | `name`, `slug` → `type: 'varchar'` |
| `user.entity.ts` | `fullName`, `email` → `type: 'varchar'`, `isEmailVerified`, `isActive` → `type: 'boolean'` |
| `task.entity.ts` | `title`, `priority` → `type: 'varchar'` |

Columns that **already had** an explicit type (e.g. `type: 'binary'`, `type: 'text'`, `type: 'int'`, `type: 'date'`, `type: 'timestamp'`, `type: 'json'`, `type: 'decimal'`) or that use `uuidBinaryTransformer` were **not** changed.

## Minimal corrected column decorators (pattern)

**String columns (VARCHAR):**

```ts
// Before (inference can become Object under Jest)
@Column({ length: 255, nullable: true })
fileName!: string | null;

// After (explicit type; MySQL VARCHAR)
@Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
fileName!: string | null;
```

**Boolean columns:**

```ts
// Before
@Column({ name: 'is_read', default: false })
isRead!: boolean;

// After
@Column({ name: 'is_read', type: 'boolean', default: false })
isRead!: boolean;
```

No changes were made to:

- Database migrations
- Application behavior or business logic
- `uuidBinaryTransformer` or any BINARY(16) / UUID columns
- Columns that already had an explicit `type`

## Compatibility and regression

- **MySQL:** `varchar` and `boolean` (mapped to `TINYINT(1)`) are standard and unchanged from what TypeORM would generate with correct inference.
- **Runtime:** Column types are metadata only; existing schema and queries are unchanged. `npm run build` and normal app run are unchanged.
- **Jest:** The `DataTypeNotSupportedError` for these entities no longer occurs when the Nest app is created in tests (e.g. `Test.createTestingModule({ imports: [AppModule] })`). Any remaining test failures (e.g. DI for `TenantGuard` / `OrganizationMembersRepository`) are unrelated to TypeORM column inference.

## Confirmation

- **Before:** Jest bootstrap failed with `DataTypeNotSupportedError: Data type "Object" in "WorkflowStatusEntity.color"` and later `"TaskAttachmentEntity.fileName"` (and would have hit more entities as load order changed).
- **After:** Entity metadata builds successfully under Jest; no TypeORM "Object" errors. Build and production behavior unchanged.

This resolves the **Jest + TypeORM metadata mismatch** for entity column types while keeping the fix minimal and production-safe.
