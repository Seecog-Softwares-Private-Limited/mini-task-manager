/**
 * API response types aligned with backend DTOs.
 */

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    isPlatformAdmin?: boolean;
  };
  organizationId?: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  isPlatformAdmin?: boolean;
  /** ISO date string; used for presence (online if within last few minutes). */
  lastSeenAt?: string;
}

/** Tenant / workspace (API: organization). */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  logoUrl?: string | null;
  /** Current user's role (Owner/Admin/Member). Only present in list response. */
  myRole?: string;
  isArchived?: boolean;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  /** Data URL or URL for project card icon */
  iconUrl?: string | null;
  visibility: string;
  isArchived: boolean;
  createdBy: string;
  /** ISO date string */
  createdAt?: string;
  /** ISO date string; used for "last updated" and recent highlight */
  updatedAt?: string;
}

export interface Task {
  id: string;
  projectId: string;
  organizationId: string;
  title: string;
  description?: string;
  statusId?: string;
  priority: string;
  assigneeId?: string;
  assigneeIds?: string[];
  assignee?: Pick<User, "id" | "fullName" | "email" | "avatarUrl">;
  reporterId: string;
  parentTaskId?: string;
  storyPoints?: number;
  dueDate?: string;
  estimatedMinutes?: number;
  loggedMinutes: number;
  sprintId?: string;
  recurringTemplateId?: string;
  recurrenceType?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM" | "NONE";
  recurrenceSequence?: number;
  tags?: Array<{ name: string; color: string }>;
  subtasks?: TaskSubtask[];
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecurrenceConfig {
  repeat?: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";
  interval?: number;
  weeklyDays?: number[];
  monthlyMode?: "DAY_OF_MONTH" | "LAST_DAY" | "NTH_WEEKDAY";
  dayOfMonth?: number;
  nthWeek?: number;
  weekday?: number;
  monthOfYear?: number;
  dayOfYearMonth?: number;
  customUnit?: "DAY" | "WEEK" | "MONTH" | "YEAR";
  endType?: "NEVER" | "ON_DATE" | "AFTER_OCCURRENCES";
  endDate?: string;
  endAfterOccurrences?: number;
  createDaysBeforeDue?: number;
  dueLogic?: "DUE_DATE" | "DUE_TIME";
  dueTime?: string;
  /** Skip Saturday/Sunday when computing next run dates. */
  skipWeekends?: boolean;
  /** How run completion is validated: all checklist items vs manual. */
  completionRule?: "ALL_CHECKLIST" | "MANUAL";
}

export type RecurringSeriesStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";

export interface RecurringTemplateSummary {
  id: string;
  title: string;
  description?: string | null;
  repeatType: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";
  nextDueDate: string;
  isPaused: boolean;
  status?: RecurringSeriesStatus;
  stoppedAt?: string | null;
  generatedCount: number;
  upcoming: number;
  completed: number;
  missed?: number;
  lastRunState?: "PENDING" | "COMPLETED" | "SKIPPED" | null;
  completionHealth?: number;
  subtaskCount?: number;
  assigneeId?: string | null;
  assigneeIds?: string[] | null;
  priority?: string;
  createdBy?: string;
  startDueDate?: string;
  endType: "NEVER" | "ON_DATE" | "AFTER_OCCURRENCES";
  createDaysBeforeDue: number;
}

export interface RecurringTaskSummary {
  totalRecurringTasks: number;
  dueThisWeek: number;
  overdue: number;
  completedThisMonth: number;
  paused: number;
}

export interface RecurringTaskOccurrence {
  id: string;
  templateId: string;
  taskId?: string | null;
  sequenceNumber: number;
  dueDate: string;
  state: "PENDING" | "COMPLETED" | "SKIPPED";
  completedAt?: string | null;
  createdAt: string;
}

export type SubtaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  dueOffsetDays?: number;
  dueTime?: string;
  status?: SubtaskStatus;
  /** @deprecated Legacy field — kept for old data; UI uses `status` instead. */
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  /** @deprecated Legacy workflow status id — superseded by `status`. */
  statusId?: string;
}

export type EntityAttachmentType = "TASK" | "SUBTASK";

export interface EntityAttachment {
  id: string;
  workspaceId: string;
  projectId: string;
  taskId?: string | null;
  entityType: EntityAttachmentType;
  entityId: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileExtension?: string | null;
  fileSize: number;
  storageProvider: string;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workflow {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
}

export interface WorkflowStatus {
  id: string;
  workflowId: string;
  name: string;
  position: number;
  color?: string;
  type: string;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status: string;
  createdAt: string;
}

export interface CustomField {
  id: string;
  projectId: string;
  name: string;
  fieldType: string;
  isRequired: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string | null;
  message?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Plan {
  id: string;
  slug: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxUsers: number | null;
  maxProjects: number | null;
  storageLimitGb: number | null;
  automationLimit: number | null;
  integrationLimit: number | null;
  maxApiKeys: number | null;
  apiEnabled: boolean;
  ssoEnabled: boolean;
  auditLogsEnabled: boolean;
  customWorkflows: boolean;
  advancedReporting: boolean;
  timeTracking: boolean;
  prioritySupport: boolean;
  slaUptime: string | null;
  features?: Record<string, unknown>;
  isPopular: boolean;
  displayOrder: number;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  planSlug: string;
  planName: string;
  billingCycle: string;
  status: string;
  startDate?: string;
  endDate?: string;
  trialEndsAt?: string;
  cancelledAt?: string;
  razorpaySubscriptionId?: string;
  daysRemaining?: number;
  isTrialExpired?: boolean;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: string;
  billingCycle: string;
  planName: string;
  userCount: number;
  issuedAt: string;
  dueDate?: string;
  paidAt?: string;
}

export interface UsageBucket {
  current: number;
  limit: number | null;
  percentage: number | null;
}

export interface UsageData {
  users: UsageBucket;
  projects: UsageBucket;
  storageGb: UsageBucket;
  automations: UsageBucket;
  integrations: UsageBucket;
  apiKeys: UsageBucket;
  planName: string | null;
  planSlug: string | null;
  subscriptionStatus: string | null;
  billingCycle: string | null;
  isTrial: boolean;
  trialEndsAt: string | null;
  isTrialExpired: boolean;
}

export interface SubscriptionLimitError {
  statusCode: number;
  error: string;
  code: 'SUBSCRIPTION_LIMIT_EXCEEDED';
  resource: string;
  current: number;
  limit: number;
  message: string;
  upgradeUrl: string;
}

export interface ActivityLog {
  id: string;
  organizationId: string;
  userId: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: { fullName?: string; email?: string } | null;
}

export interface OrgMember {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  status: string;
  invitedAt?: string;
  joinedAt?: string;
  user?: Pick<User, "id" | "fullName" | "email" | "avatarUrl" | "lastSeenAt">;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  addedAt: string;
  user?: Pick<User, "id" | "fullName" | "email" | "avatarUrl">;
}

export interface OrgInvitation {
  id: string;
  organizationId: string;
  organizationName?: string;
  email: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
  createdAt: string;
  inviter?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface InvitationValidation {
  valid: boolean;
  reason?: string;
  email?: string;
  organizationName?: string;
  role?: string;
}

export interface InvitationValidationEnriched {
  valid: boolean;
  reason?: string;
  organization?: { id: string; name: string };
  project?: { id: string; name: string } | null;
  role?: string;
  email?: string;
  expires_at?: string;
  status?: string;
  account_exists?: boolean;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, "id" | "fullName" | "email" | "avatarUrl">;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}
