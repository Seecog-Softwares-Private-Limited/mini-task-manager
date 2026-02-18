# Backend → Frontend Domain Mapping & API Contract

## 1. Domain Mapping Table

| Backend Module        | Frontend Module   | API Prefix      | Tenant (X-Organization-Id) | Auth   |
|-----------------------|-------------------|-----------------|---------------------------|--------|
| Auth                  | auth              | /auth           | No                        | Public (login) / JWT (logout) |
| Users                 | users             | /users          | No                        | JWT    |
| Organizations         | organizations     | /organizations  | Yes (must match :id)      | JWT    |
| Projects              | projects          | /projects       | Yes (required)            | JWT + TenantGuard |
| Tasks                 | tasks             | /tasks          | Yes                       | JWT + TenantGuard |
| Workflows             | workflows         | /workflows      | Yes                       | JWT + TenantGuard |
| Sprints               | sprints           | /sprints        | Yes                       | JWT + TenantGuard |
| Custom Fields         | custom-fields     | /custom-fields  | Yes                       | JWT + TenantGuard |
| Notifications         | notifications     | /notifications  | No                        | JWT    |
| Billing               | billing           | /billing        | Plans: no; Subscription: yes | JWT (+ Tenant for subscription) |
| Activity Logs         | activity-logs     | /activity-logs  | Yes                       | JWT + TenantGuard |
| Health                | (infra)           | /health         | No                        | Public |

**Base URL:** `{API_ORIGIN}/api/v1` (e.g. `http://localhost:3000/api/v1`).

---

## 2. API Contract Summary

### 2.1 Auth Flow

- **POST /auth/login**  
  Body: `{ email: string, password: string }`  
  Response 201: `{ accessToken: string, user: { id, email, fullName } }`  
  Errors: 401 Invalid credentials, 429 throttled.

- **POST /auth/logout**  
  Headers: `Authorization: Bearer <token>`  
  Response 201: `{ message: string }`  
  (Client should discard token; backend is stateless.)

### 2.2 Tenant Header (X-Organization-Id)

- **Required** for: projects, tasks, workflows, sprints, custom-fields, activity-logs, billing/subscription.
- **Semantics:** Current organization context. User must be a member (enforced by TenantGuard).
- **Organization GET by id:** Header `X-Organization-Id` must equal the requested org id.

### 2.3 Role Usage

- Backend sets `request.user.roles = [membership.role]` (e.g. `admin`, `member`) after TenantGuard.
- No role-based route restrictions in controllers yet; frontend can hide/disable UI by role for future use.

### 2.4 Pagination Format

- **Query:** `?page=1&limit=20` (page ≥ 1, limit 1–100).
- **Response:** `{ data: T[], meta: { total, page, limit, totalPages, hasNext, hasPrev } }`.
- **Used by:** tasks (by project), notifications, activity-logs.

### 2.5 Error Response Format

- **Shape:** `{ statusCode: number, message: string | string[] }` (NestJS validation can return `message[]`).
- **401:** Unauthorized → redirect to login, clear token.
- **403:** Forbidden → show message, do not clear token.
- **404:** Not found.
- **429:** Too Many Requests → show “Rate limited” and optional retry-after.

### 2.6 Endpoints by Module

| Method | Path | Body/Query | Response |
|--------|------|------------|----------|
| POST   | /auth/login | { email, password } | { accessToken, user } |
| POST   | /auth/logout | - | { message } |
| GET    | /users/:id | - | User \| null (own profile only) |
| POST   | /organizations | { name, slug } | Organization |
| GET    | /organizations/:id | Header X-Organization-Id: id | Organization \| null |
| GET    | /projects | - | Project[] |
| GET    | /projects/:id | - | Project \| null |
| POST   | /projects | { name, description?, visibility? } | Project |
| GET    | /tasks/project/:projectId | ?page=&limit= | PaginatedResult<Task> |
| GET    | /tasks/:id | - | Task \| null |
| POST   | /tasks | CreateTaskDto | Task |
| GET    | /workflows/project/:projectId | - | Workflow[] |
| GET    | /workflows/:id | - | Workflow \| null |
| POST   | /workflows | { projectId, name, isDefault? } | Workflow |
| GET    | /sprints/project/:projectId | - | Sprint[] |
| GET    | /sprints/:id | - | Sprint \| null |
| POST   | /sprints | CreateSprintDto | Sprint |
| GET    | /custom-fields/project/:projectId | - | CustomField[] |
| POST   | /custom-fields | CreateCustomFieldDto | CustomField |
| GET    | /notifications | ?page=&limit= | PaginatedResult<Notification> |
| PATCH  | /notifications/:id/read | - | { message } |
| GET    | /billing/plans | - | Plan[] |
| GET    | /billing/subscription | - | Subscription \| null (needs tenant) |
| GET    | /activity-logs | ?page=&limit= | PaginatedResult<ActivityLog> |
| GET    | /health | - | Terminus health JSON |

---

## 3. Required Frontend Modules

1. **Auth** – Login, logout, token storage, 401 handling.
2. **Organizations** – Create org, get by id, org switcher (current tenant).
3. **Projects** – List, get, create (under current org).
4. **Tasks** – List by project (paginated), get, create; Kanban + table views.
5. **Workflows** – List by project, get, create.
6. **Sprints** – List by project, get, create.
7. **Custom Fields** – List by project, create.
8. **Notifications** – List (paginated), mark as read.
9. **Billing** – Plans list, subscription (with tenant).
10. **Activity Logs** – List (paginated, with tenant).
11. **Users** – Own profile (GET /users/:id with id = current user).

---

## 4. Frontend Architecture Notes

- **JWT:** Send `Authorization: Bearer <token>` on every authenticated request.
- **Tenant:** Send `X-Organization-Id: <currentOrgId>` on every request that uses TenantGuard; store current org in context/cookie and provide org switcher.
- **Stateless:** No session store on backend; frontend stores token (e.g. memory + cookie or cookie-only for SSR).
- **Throttling:** Backend returns 429; frontend should show a message and optionally retry with backoff.
