import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configuration } from './configuration';
import { validate } from './env.validation';

/** Single env file at repo root (`bootstrap-env.ts` also loads this before Nest starts). */
const ROOT_ENV = join(process.cwd(), '.env');

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: [ROOT_ENV],
    }),
  ],
})
export class ConfigModule {}
