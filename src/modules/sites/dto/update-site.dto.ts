import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateSiteDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  address?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
