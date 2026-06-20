import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { PlansService } from './plans.service';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CreateUserPlanOrderDto } from './dto/create-user-plan-order.dto';
import { VerifyUserPlanPaymentDto } from './dto/verify-user-plan-payment.dto';

type AuthUser = { userId: string; organizationId?: string };

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Public()
  @Get()
  listPlans() {
    return this.plansService.listPlans();
  }

  @Get('current')
  getCurrent(@Req() req: { user: AuthUser }) {
    return this.plansService.getCurrent(req.user.userId);
  }

  @Get('usage')
  getUsage(
    @Req() req: { user: AuthUser },
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.plansService.getUsage(req.user.userId, organizationId?.trim() || undefined);
  }

  @Post('validate-coupon')
  validateCoupon(@Req() req: { user: AuthUser }, @Body() dto: ValidateCouponDto) {
    return this.plansService.validateCoupon(req.user.userId, dto.code, dto.plan);
  }

  @Post('create-order')
  createOrder(@Req() req: { user: AuthUser }, @Body() dto: CreateUserPlanOrderDto) {
    return this.plansService.createOrder(req.user.userId, dto.plan, dto.couponCode);
  }

  @Post('verify-payment')
  verifyPayment(@Req() req: { user: AuthUser }, @Body() dto: VerifyUserPlanPaymentDto) {
    return this.plansService.verifyPayment(req.user.userId, dto);
  }

  /** Legacy alias — prefer POST /plans/create-order */
  @Post('upgrade')
  upgrade(@Req() req: { user: AuthUser }, @Body() dto: UpgradePlanDto) {
    return this.plansService.createOrder(req.user.userId, dto.plan, dto.couponCode);
  }
}
