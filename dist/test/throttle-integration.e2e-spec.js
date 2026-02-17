"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const request = require("supertest");
const bcrypt = require("bcrypt");
const typeorm_1 = require("@nestjs/typeorm");
const app_module_1 = require("../src/app.module");
const http_exception_filter_1 = require("../src/common/filters/http-exception.filter");
const configuration_1 = require("../src/config/configuration");
const uuid_util_1 = require("../src/common/utils/uuid.util");
const user_entity_1 = require("../src/modules/users/entities/user.entity");
const organization_entity_1 = require("../src/modules/organizations/entities/organization.entity");
const organization_member_entity_1 = require("../src/modules/organizations/entities/organization-member.entity");
const project_entity_1 = require("../src/modules/projects/entities/project.entity");
const API_PREFIX = 'api/v1';
const PASSWORD = 'Password123!';
const THROTTLE_TEST_EMAIL = 'throttle-test@example.com';
function createThrottleTestConfigService() {
    const base = (0, configuration_1.configuration)();
    base.throttle = {
        auth: { ttl: 60000, limit: 3 },
        general: { ttl: 60000, limit: 5 },
    };
    return {
        get: (key) => {
            const value = key.split('.').reduce((o, k) => o?.[k], base);
            return value;
        },
    };
}
describe('Throttle integration (rate limiting, brute-force protection)', () => {
    let app;
    let token;
    let orgId;
    beforeAll(async () => {
        const mockConfig = createThrottleTestConfigService();
        const moduleRef = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        })
            .overrideProvider(config_1.ConfigService)
            .useValue(mockConfig)
            .compile();
        app = moduleRef.createNestApplication();
        app.setGlobalPrefix(API_PREFIX);
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }));
        app.useGlobalFilters(new http_exception_filter_1.GlobalExceptionFilter());
        await app.init();
        const dataSource = app.get((0, typeorm_1.getDataSourceToken)());
        const hash = await bcrypt.hash(PASSWORD, 10);
        await dataSource.transaction(async (manager) => {
            const userId = (0, uuid_util_1.generateUuid)();
            const orgIdInner = (0, uuid_util_1.generateUuid)();
            const projectId = (0, uuid_util_1.generateUuid)();
            await manager.getRepository(user_entity_1.UserEntity).save(manager.getRepository(user_entity_1.UserEntity).create({
                id: userId,
                email: THROTTLE_TEST_EMAIL,
                fullName: 'Throttle Test User',
                passwordHash: hash,
            }));
            await manager.getRepository(organization_entity_1.OrganizationEntity).save(manager.getRepository(organization_entity_1.OrganizationEntity).create({
                id: orgIdInner,
                name: 'Throttle Org',
                slug: 'throttle-org-' + Date.now(),
                ownerId: userId,
            }));
            await manager.getRepository(organization_member_entity_1.OrganizationMemberEntity).save(manager.getRepository(organization_member_entity_1.OrganizationMemberEntity).create({
                id: (0, uuid_util_1.generateUuid)(),
                organizationId: orgIdInner,
                userId,
                role: 'admin',
            }));
            await manager.getRepository(project_entity_1.ProjectEntity).save(manager.getRepository(project_entity_1.ProjectEntity).create({
                id: projectId,
                organizationId: orgIdInner,
                createdBy: userId,
                name: 'Throttle Project',
                description: null,
                visibility: 'PRIVATE',
            }));
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
            const auth = () => request(app.getHttpServer())
                .get(projectsUrl)
                .set('Authorization', `Bearer ${token}`)
                .set('X-Organization-Id', orgId);
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
//# sourceMappingURL=throttle-integration.e2e-spec.js.map