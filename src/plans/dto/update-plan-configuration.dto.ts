import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdatePlanConfigurationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStorage?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxWorkspaces?: number | null;
}

