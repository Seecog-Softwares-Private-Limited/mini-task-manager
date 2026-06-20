import { IsBoolean, IsInt, IsOptional, Min, ValidateIf } from 'class-validator';

export class UpdatePlanConfigurationDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  maxUsers?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStorage?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  maxWorkspaces?: number | null;

  @IsOptional()
  @IsBoolean()
  allowCoupon?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMonthlyInr?: number;
}

