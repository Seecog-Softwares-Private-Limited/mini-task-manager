import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { DeviceTokensRepository } from './repositories/device-tokens.repository';
import { DeleteDeviceTokenDto, RegisterDeviceTokenDto } from './dto/device-token.dto';

@Controller('device-tokens')
@SkipThrottle({ auth: true })
@UseGuards(JwtAuthGuard)
export class DeviceTokensController {
  constructor(private readonly deviceTokensRepository: DeviceTokensRepository) {}

  @Post()
  async register(
    @CurrentUserId() userId: string,
    @Body() body: RegisterDeviceTokenDto,
  ): Promise<{ message: string }> {
    await this.deviceTokensRepository.upsert({
      userId,
      token: body.token,
      platform: body.platform,
      deviceId: body.deviceId,
    });
    return { message: 'OK' };
  }

  @Delete()
  async unregister(
    @CurrentUserId() userId: string,
    @Body() body: DeleteDeviceTokenDto,
  ): Promise<{ message: string }> {
    await this.deviceTokensRepository.deleteByTokenAndUser(body.token, userId);
    return { message: 'OK' };
  }
}
