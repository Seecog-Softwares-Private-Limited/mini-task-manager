/**
 * Integration tests for rate limiting and brute-force protection.
 * Uses low throttle limits (overridden via ConfigService) to assert 429 when limits are exceeded.
 * Run: npm test -- throttle-integration
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import { configuration } from '../src/config/configuration';
import { generateUuid } from '../src/common/utils/uuid.util';
import { UserEntity } from '../src/modules/users/entities/user.entity';
import { OrganizationEntity } from '../src/modules/organizations/entities/organization.entity';
import { OrganizationMemberEntity } from '../src/modules/organizations/entities/organization-member.entity';
import { ProjectEntity } from '../src/modules/projects/entities/project.entity';

const API_PREFIX = 'api/v1';
const PASSWORD = 'Password123!';
const THROTTLE_TEST_EMAIL = 'throttle-test@example.com';

/** ConfigService mock that uses real config but overrides throttle to low limits for tests. */
function createThrottleTestConfigService(): ConfigService {
  const base = configuration() as Record<string, unknown>;
  base.throttle = {
    auth: { ttl: 60000, limit: 3 },
    general: { ttl: 60000, limit: 5 },
  };
  return {
    get: (key: string) => {
      const value = key.split('.').reduce((o: unknown, k) => (o as Record<string, unknown>)?.[k], base);
      return value;
    },
  } as unknown as ConfigService;
}

describe('Throttle integration (rate limiting, brute-force protection)', () => {
  let app: INestApplication;
  let token: string;
  let orgId: string;

  beforeAll(async () => {
    const mockConfig = createThrottleTestConfigService();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfig)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    const dataSource = app.get(getDataSourceToken()) as DataSource;
    const hash = await bcrypt.hash(PASSWORD, 10);

    await dataSource.transaction(async (manager) => {
      const userId = generateUuid();
      const orgIdInner = generateUuid();
      const projectId = generateUuid();

      await manager.getRepository(UserEntity).save(
        manager.getRepository(UserEntity).create({
          id: userId,
          email: THROTTLE_TEST_EMAIL,
          fullName: 'Throttle Test User',
          passwordHash: hash,
        }),
      );
      await manager.getRepository(OrganizationEntity).save(
        manager.getRepository(OrganizationEntity).create({
          id: orgIdInner,
          name: 'Throttle Org',
          slug: 'throttle-org-' + Date.now(),
          ownerId: userId,
        }),
      );
      await manager.getRepository(OrganizationMemberEntity).save(
        manager.getRepository(OrganizationMemberEntity).create({
          id: generateUuid(),
          organizationId: orgIdInner,
          userId,
          role: 'admin',
        }),
      );
      await manager.getRepository(ProjectEntity).save(
        manager.getRepository(ProjectEntity).create({
          id: projectId,
          organizationId: orgIdInner,
          createdBy: userId,
          name: 'Throttle Project',
          description: null,
          visibility: 'PRIVATE',
        }),
      );

      orgId = orgIdInner;
    });

    const loginRes = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send({ email: THROTTLE_TEST_EMAIL, password: PASSWORD });
    if (loginRes.status !== 201 || !loginRes.body?.accessToken) {
      throw new Error('Throttle test seed login failed: ' + JSON.stringify(loginRes.body));
    }
    token = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('1. Auth endpoint (login) – brute-force protection', () => {
    it('returns 429 when login attempts exceed auth throttle limit', async () => {
      const loginUrl = `/${API_PREFIX}/auth/login`;
      // beforeAll already used 1 login (success). Auth limit is 3, so 2 more allowed, then 429.
      await request(app.getHttpServer()).post(loginUrl).send({ email: 'a@b.com', password: 'wrong' });
      await request(app.getHttpServer()).post(loginUrl).send({ email: 'a@b.com', password: 'wrong' });

      const third = await request(app.getHttpServer())
        .post(loginUrl)
        .send({ email: 'a@b.com', password: 'wrong' });

      expect(third.status).toBe(429);
    });
  });

  describe('2. General API – authenticated route throttling', () => {
    it('returns 429 when authenticated requests exceed general throttle limit', async () => {
      const projectsUrl = `/${API_PREFIX}/projects`;
      const auth = () =>
        request(app.getHttpServer())
          .get(projectsUrl)
          .set('Authorization', `Bearer ${token}`)
          .set('X-Organization-Id', orgId);

      // beforeAll used 1 GET /projects (implicitly no - we only did login). We have 5 allowed, 6th returns 429.
      await auth();
      await auth();
      await auth();
      await auth();
      await auth();

      const sixth = await auth();
      expect(sixth.status).toBe(429);
    });
  });
});
