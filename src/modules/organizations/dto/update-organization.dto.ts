import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
