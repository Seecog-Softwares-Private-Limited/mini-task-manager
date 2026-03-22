import { Allow, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  description?: string;

  /** Data URLs or long URLs; aligns with DB MEDIUMTEXT and ~500KB upload → base64 ~700k chars */
  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(1_000_000)
  iconUrl?: string;

  @IsOptional()
  @IsString()
  visibility?: string;
}
