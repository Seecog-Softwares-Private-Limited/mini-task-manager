import { IsBoolean, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric and hyphens only' })
  slug?: string;

  /** Image URL or data URL. Send empty string to remove the workspace logo. */
  @IsOptional()
  @IsString()
  @MaxLength(150_000)
  logoUrl?: string;
}
