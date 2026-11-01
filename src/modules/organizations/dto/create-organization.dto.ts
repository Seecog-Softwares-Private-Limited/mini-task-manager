import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { INDUSTRY_KEYS } from '../industry-packs';

export class CreateOrganizationDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsIn(INDUSTRY_KEYS)
  industry?: string;

  /**
   * Optional for backward compatibility. Ignored by the service — a unique
   * internal slug is always generated server-side.
   */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150_000)
  logoUrl?: string;
}
