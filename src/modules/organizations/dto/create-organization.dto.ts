import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MaxLength(150)
  name!: string;

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
