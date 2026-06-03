import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import type { UserPlanSlug } from '../../config/plans.config';

export class ValidateCouponDto {
  @IsString()
  @MinLength(4)
  @MaxLength(40)
  code!: string;

  @IsIn(['silver', 'gold'])
  plan!: UserPlanSlug;
}
