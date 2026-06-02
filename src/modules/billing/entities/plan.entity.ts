import { Entity, PrimaryColumn, Column } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';

@Entity('plans')
export class PlanEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  slug!: string; // 'free', 'pro', 'enterprise'

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'price_monthly', type: 'decimal', precision: 10, scale: 2, default: 0 })
  priceMonthly!: number;

  @Column({ name: 'price_yearly', type: 'decimal', precision: 10, scale: 2, default: 0 })
  priceYearly!: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @Column({ name: 'billing_cycle', type: 'varchar', length: 50, default: 'monthly' })
  billingCycle!: string;

  // ── Limits ──
  @Column({ name: 'max_users', type: 'int', nullable: true })
  maxUsers!: number | null;

  @Column({ name: 'max_projects', type: 'int', nullable: true })
  maxProjects!: number | null;

  @Column({ name: 'max_tasks', type: 'int', nullable: true })
  maxTasks!: number | null;

  @Column({ name: 'storage_limit_gb', type: 'int', nullable: true })
  storageLimitGb!: number | null;

  @Column({ name: 'trial_days', type: 'int', default: 0 })
  trialDays!: number;

  @Column({ name: 'automation_limit', type: 'int', nullable: true })
  automationLimit!: number | null;

  @Column({ name: 'integration_limit', type: 'int', nullable: true })
  integrationLimit!: number | null;

  @Column({ name: 'max_api_keys', type: 'int', nullable: true })
  maxApiKeys!: number | null;

  @Column({ name: 'api_enabled', type: 'boolean', default: false })
  apiEnabled!: boolean;

  @Column({ name: 'sso_enabled', type: 'boolean', default: false })
  ssoEnabled!: boolean;

  @Column({ name: 'audit_logs_enabled', type: 'boolean', default: false })
  auditLogsEnabled!: boolean;

  @Column({ name: 'custom_workflows', type: 'boolean', default: false })
  customWorkflows!: boolean;

  @Column({ name: 'advanced_reporting', type: 'boolean', default: false })
  advancedReporting!: boolean;

  @Column({ name: 'time_tracking', type: 'boolean', default: false })
  timeTracking!: boolean;

  @Column({ name: 'priority_support', type: 'boolean', default: false })
  prioritySupport!: boolean;

  @Column({ name: 'sla_uptime', type: 'varchar', length: 10, nullable: true })
  slaUptime!: string | null;

  @Column({ type: 'json', nullable: true })
  features!: Record<string, unknown> | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ name: 'is_popular', type: 'boolean', default: false })
  isPopular!: boolean;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
