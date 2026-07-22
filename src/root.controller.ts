import { Controller, Get, Res } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Response } from 'express';

@Controller()
@SkipThrottle({ default: true, auth: true })
export class RootController {
  @Get()
  @Public()
  root() {
    return {
      message: 'OpsPick API',
      api: '/api/v1',
      openapi: '/api/v1/openapi.yaml',
      docs: `Use the API at /api/v1. Frontend: http://localhost:${process.env.FRONTEND_PORT || '3001'}`,
    };
  }

  @Get('openapi.yaml')
  @Public()
  openapi(@Res() res: Response) {
    const specPath = join(__dirname, 'docs', 'openapi.yaml');
    const yaml = readFileSync(specPath, 'utf8');
    res.setHeader('Content-Type', 'application/yaml');
    res.send(yaml);
  }
}
