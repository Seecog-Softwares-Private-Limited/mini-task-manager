import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class SuperAdminTenantQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ALL', 'ACTIVE', 'SUSPENDED'])
  status?: 'ALL' | 'ACTIVE' | 'SUSPENDED';

  @IsOptional()
  @IsIn(['free', 'silver', 'gold', 'starter', 'pro', 'enterprise'])
  plan?: string;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @IsOptional()
  @IsIn(['name', 'createdAt', 'updatedAt', 'status'])
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'status';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortDirection?: 'ASC' | 'DESC';

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;
}

export class SuperAdminUserQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['all', 'active', 'inactive'])
  status?: 'all' | 'active' | 'inactive';

  @IsOptional()
  @IsIn(['true', 'false'])
  platformAdmin?: 'true' | 'false';

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;
}

export class SuperAdminSetTenantStatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status!: 'ACTIVE' | 'SUSPENDED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class SuperAdminPlanUpsertDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(0)
  priceMonthly!: number;

  @IsInt()
  @Min(0)
  priceYearly!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxWorkspaces?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxUsers?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxProjects?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxTasks?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxStorageGb?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SuperAdminSubscriptionActionDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billingCycle?: 'monthly' | 'yearly';

  @IsOptional()
  @IsIn(['ACTIVE', 'EXPIRED', 'CANCELLED', 'PAST_DUE', 'TRIAL'])
  status?: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAST_DUE' | 'TRIAL';
}

export class SuperAdminSettingsUpdateDto {
  @IsString()
  settingKey!: string;

  @IsOptional()
  settingValue?: unknown;
}

export class SuperAdminSendNotificationDto {
  @IsIn(['single', 'multiple', 'all'])
  targetScope!: 'single' | 'multiple' | 'all';

  @IsOptional()
  @IsArray()
  targetOrganizationIds?: string[];

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(5000)
  message!: string;
}

export class SuperAdminImpersonateDto {
  @IsUUID()
  targetUserId!: string;

  @IsOptional()
  @IsUUID()
  targetOrganizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class SuperAdminStopImpersonationDto {
  @IsString()
  sessionId!: string;
}

