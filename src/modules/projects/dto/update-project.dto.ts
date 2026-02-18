import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  visibility?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
