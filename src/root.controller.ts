import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
@SkipThrottle({ default: true, auth: true })
export class RootController {
  @Get()
  @Public()
  root() {
    return {
      message: 'Mini Task Manager API',
      api: '/api/v1',
      docs: 'Use the API at /api/v1. Frontend: http://localhost:3001',
    };
  }
}
