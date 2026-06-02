import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { Repository } from 'typeorm';
import { PLAN_ORDER, type UserPlanSlug } from '../config/plans.config';
import { UpdatePlanConfigurationDto } from './dto/update-plan-configuration.dto';
import { PlanConfigurationsService } from './plan-configurations.service';
import { UserEntity } from '../modules/users/entities/user.entity';

function parsePlanName(value: string): UserPlanSlug {
  const slug = value.toLowerCase() as UserPlanSlug;
  if (!PLAN_ORDER.includes(slug)) {
    throw new BadRequestException(`Invalid plan "${value}"`);
  }
  return slug;
}

@Controller('plan-configurations')
@UseGuards(JwtAuthGuard)
export class PlanConfigurationsController {
  constructor(
    private readonly planConfigurationsService: PlanConfigurationsService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  private async assertAdmin(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.isPlatformAdmin) {
      throw new ForbiddenException('Platform administrator access required');
    }
  }

  @Get()
  getAll() {
    return this.planConfigurationsService.getAll();
  }

  @Get(':planName')
  getByPlan(@Param('planName') planName: string) {
    return this.planConfigurationsService.getByPlanName(parsePlanName(planName));
  }

  @Put(':planName')
  updatePlan(
    @Req() req: { user: { userId: string } },
    @Param('planName') planName: string,
    @Body() dto: UpdatePlanConfigurationDto,
  ) {
    return this.assertAdmin(req.user.userId).then(() =>
      this.planConfigurationsService.updatePlan(parsePlanName(planName), dto),
    );
  }
}

