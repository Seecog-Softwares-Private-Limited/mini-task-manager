import { Allow, IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  description?: string;

  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(1_000_000)
  iconUrl?: string;

  @IsOptional()
  @IsString()
  visibility?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
