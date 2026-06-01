import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdminListOrganizationsQueryDto {
  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ALL', 'ACTIVE', 'SUSPENDED'])
  status?: 'ALL' | 'ACTIVE' | 'SUSPENDED';
}

export class AdminSetPlanDto {
  @IsUUID()
  planId!: string;

  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billingCycle?: 'monthly' | 'yearly';
}

export class AdminSuspendOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class AdminSetUserActiveDto {
  @IsBoolean()
  active!: boolean;
}

export interface AdminOrganizationListItemDto {
  id: string;
  name: string;
  slug: string;
  status: string;
  ownerEmail: string;
  ownerName: string;
  memberCount: number;
  planName: string | null;
  planSlug: string | null;
  subscriptionStatus: string | null;
  createdAt: Date;
  suspendedAt: Date | null;
}

export interface AdminOrganizationDetailDto extends AdminOrganizationListItemDto {
  suspensionReason: string | null;
  usage: {
    users: { current: number; limit: number | null };
    projects: { current: number; limit: number | null };
    storageGb: { current: number; limit: number | null };
  };
  planId: string | null;
}
