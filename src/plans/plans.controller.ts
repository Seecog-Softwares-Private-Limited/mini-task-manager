import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { PlansService } from './plans.service';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

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
  getCurrent(@Req() req: { user: { sub: string } }) {
    return this.plansService.getCurrent(req.user.sub);
  }

  @Get('usage')
  getUsage(@Req() req: { user: { sub: string; organizationId?: string } }) {
    const orgId = req.user.organizationId;
    return this.plansService.getUsage(req.user.sub, orgId);
  }

  @Post('validate-coupon')
  validateCoupon(@Req() req: { user: { sub: string } }, @Body() dto: ValidateCouponDto) {
    return this.plansService.validateCoupon(req.user.sub, dto.code, dto.plan);
  }

  @Post('upgrade')
  upgrade(@Req() req: { user: { sub: string } }, @Body() dto: UpgradePlanDto) {
    return this.plansService.upgrade(
      req.user.sub,
      dto.plan,
      dto.paymentId,
      dto.couponCode,
    );
  }
}
