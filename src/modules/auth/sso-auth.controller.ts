import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SSOAuthService } from './sso-auth.service';

@Controller('auth/sso')
export class SSOAuthController {
  constructor(private readonly ssoAuthService: SSOAuthService) {}

  @Public()
  @Get('start')
  async start(
    @Query('organizationId') organizationId?: string,
    @Query('email') email?: string,
  ) {
    return this.ssoAuthService.startLogin({ organizationId, email });
  }

  @Public()
  @Get('callback')
  async callbackGet(
    @Query('state') state: string,
    @Query('code') code?: string,
    @Query('email') email?: string,
    @Query('name') name?: string,
  ) {
    return this.ssoAuthService.handleCallback({ state, code, email, name });
  }

  @Public()
  @Post('callback')
  async callbackPost(
    @Body() body: { state: string; code?: string; email?: string; name?: string },
  ) {
    return this.ssoAuthService.handleCallback(body);
  }
}
