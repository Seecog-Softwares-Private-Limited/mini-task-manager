# Integration Test DI Fix – TenantGuard / OrganizationMembersRepository

## Root cause

NestJS resolves **guard dependencies from the module that declares the controller** (the “calling” module), not from the module that provides the guard.

- `TenantGuard` is provided and exported by **AuthModule** and depends on `ORGANIZATION_MEMBERS_REPOSITORY` (from **OrganizationsModule**).
- Controllers in **ProjectsModule**, **TasksModule**, **WorkflowsModule**, **SprintsModule**, **CustomFieldsModule**, **ActivityLogsModule**, and **BillingModule** use `@UseGuards(JwtAuthGuard, TenantGuard)`.
- When Nest instantiates `TenantGuard` for those controllers, it resolves the guard’s dependencies in **that controller’s module** (e.g. ProjectsModule). Those modules imported **AuthModule** (so they get the guard class) but did **not** import **OrganizationsModule**, so `ORGANIZATION_MEMBERS_REPOSITORY` was not in scope.
- Result: `Nest can't resolve dependencies of the TenantGuard (Reflector, ?). Symbol(OrganizationMembersRepository) at index [1] is not available in the ProjectsModule context.`

In normal runtime this can still work depending on module init order; in the test context (e.g. `Test.createTestingModule({ imports: [AppModule] })`) the resolution is stricter and the missing dependency in the calling module’s context surfaces.

## Fix (application-side, production-safe)

Each **feature module that uses TenantGuard** in its controllers must also **import OrganizationsModule**, so that `ORGANIZATION_MEMBERS_REPOSITORY` is available in the same context where the guard is resolved.

**Modules updated:**

- `ProjectsModule`
- `TasksModule`
- `WorkflowsModule`
- `SprintsModule`
- `CustomFieldsModule`
- `ActivityLogsModule`
- `BillingModule`

In each of these, `OrganizationsModule` was added to the `imports` array. No business logic, guards, or security behavior was changed.

## Test bootstrap

No change to the test bootstrap is required. The integration test continues to use:

```ts
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
}).compile();

app = moduleRef.createNestApplication();
app.setGlobalPrefix(API_PREFIX);
app.useGlobalPipes(new ValidationPipe({ ... }));
app.useGlobalFilters(new GlobalExceptionFilter());
await app.init();
```

With the module imports fixed, `compile()` and `app.init()` complete successfully; **TenantGuard** and **OrganizationMembersRepository** resolve correctly in every module that uses the guard. Any remaining failures (e.g. DB connection or seed FK errors) are unrelated to DI.

## Confirmation

- **Before:** `beforeAll` failed at `.compile()` with `TenantGuard` / `ORGANIZATION_MEMBERS_REPOSITORY` not available in ProjectsModule (and similarly in other modules).
- **After:** Module compilation and `app.init()` succeed; integration tests bootstrap properly. Guards and repositories are resolved without mocks; security behavior is unchanged.
