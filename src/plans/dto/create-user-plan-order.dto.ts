import { IsIn, IsOptional, IsString } from 'class-validator';
import type { UserPlanSlug } from '../../config/plans.config';

export class CreateUserPlanOrderDto {
  @IsIn(['silver', 'gold'])
  plan!: UserPlanSlug;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
