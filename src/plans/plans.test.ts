/**
 * Automated plan limit tests — run via `npm run test:plans`
 */
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PlanLimitService } from './plan-limit.service';
import { PlansService } from './plans.service';
import { PaymentService } from './payment.service';
import { UsersRepository } from '../modules/users/repositories/users.repository';
import { UsersService } from '../modules/users/users.service';
import { OrganizationsService } from '../modules/organizations/organizations.service';
import { LimitExceededException } from './limit-exceeded.exception';
import { PLANS } from '../config/plans.config';

export interface TestResult {
  name: string;
  pass: boolean;
  error?: string;
}

const MB = 1024 * 1024;
const GB = 1024 * MB;

function isLimitError(err: unknown): err is LimitExceededException {
  return err instanceof LimitExceededException;
}

async function createTestUser(usersService: UsersService, tag: string) {
  return usersService.create({
    email: `plan-test-${tag}-${Date.now()}@example.com`,
    fullName: `Plan Test ${tag}`,
    password: 'TestPassword123!',
  });
}

async function cleanupUser(
  usersRepo: UsersRepository,
  orgsService: OrganizationsService,
  userId: string,
) {
  const orgs = await orgsService.findOrganizationsForUser(userId);
  for (const org of orgs) {
    try {
      await orgsService.update(org.id, { isArchived: true });
    } catch {
      /* ignore */
    }
  }
  try {
    await usersRepo.deleteById(userId);
  } catch {
    /* ignore */
  }
}

export async function runAllPlanTests(app: INestApplicationContext): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const planLimit = app.get(PlanLimitService);
  const plansService = app.get(PlansService);
  const paymentService = app.get(PaymentService);
  const usersRepo = app.get(UsersRepository);
  const usersService = app.get(UsersService);
  const orgsService = app.get(OrganizationsService);

  const run = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (e) {
      results.push({
        name,
        pass: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const freeUser = await createTestUser(usersService, 'free');

  // ─── FREE PLAN ───
  await run('New user gets FREE plan by default', async () => {
    const u = await usersService.findById(freeUser.id);
    const plan = u?.currentPlan ?? 'free';
    if (plan !== 'free') throw new Error(`Expected free, got ${plan}`);
  });

  await run('Can create 1 workspace (Free)', async () => {
    const ok = await planLimit.checkWorkspaceLimit(freeUser.id);
    if (!ok) throw new Error('Expected workspace allowed');
    await orgsService.create(freeUser.id, {
      name: 'Plan Test Org 1',
      slug: `plan-test-${Date.now()}-1`,
    });
  });

  const org1List = await orgsService.findOrganizationsForUser(freeUser.id);
  const org1 = org1List[0]!;

  await run('Cannot create 2nd workspace (LIMIT_EXCEEDED)', async () => {
    try {
      await orgsService.create(freeUser.id, {
        name: 'Plan Test Org 2',
        slug: `plan-test-${Date.now()}-2`,
      });
      throw new Error('Should have thrown');
    } catch (e) {
      if (!isLimitError(e)) throw e;
      const body = e.getResponse() as { error?: string; upgradeTo?: unknown[] };
      if (body.error !== 'LIMIT_EXCEEDED') throw new Error('Wrong error code');
      if (!body.upgradeTo?.length) throw new Error('Missing upgradeTo');
    }
  });

  await run('Upgrade popup data shape (Free workspace)', async () => {
    try {
      await planLimit.assertWorkspaceLimit(freeUser.id);
      throw new Error('Should fail at limit');
    } catch (e) {
      if (!isLimitError(e)) throw e;
      const body = e.getResponse() as {
        limitType: string;
        currentPlan: string;
        upgradeTo: { plan: string; price: number }[];
      };
      if (body.limitType !== 'workspace') throw new Error('Wrong limitType');
      if (body.currentPlan !== 'free') throw new Error('Wrong plan');
      if (!body.upgradeTo.some((o) => o.plan === 'silver' && o.price === 500)) {
        throw new Error('Missing silver upgrade option');
      }
    }
  });

  await run('Can add up to 5 members (Free) — check at 5 seats', async () => {
    const count = await planLimit.getUsageStats(freeUser.id, org1.id);
    if (count.members.limit !== 5) throw new Error('Free member limit should be 5');
  });

  await run('Cannot exceed 500MB storage (Free)', async () => {
    const limit = PLANS.free.limits.storageBytes;
    await usersRepo.update(freeUser.id, { storageUsed: String(limit) });
    const ok = await planLimit.checkStorageLimit(freeUser.id, 1);
    if (ok) throw new Error('Should block over limit');
    await usersRepo.update(freeUser.id, { storageUsed: '0' });
  });

  // ─── SILVER PLAN ───
  const silverUser = await createTestUser(usersService, 'silver');
  await plansService.activatePlan(silverUser.id, 'silver');

  await run('Plan upgraded to SILVER successfully', async () => {
    const u = await usersService.findById(silverUser.id);
    if (u?.currentPlan !== 'silver') throw new Error(`Not silver: ${u?.currentPlan}`);
  });

  await run('Silver: 1 workspace OK', async () => {
    await orgsService.create(silverUser.id, {
      name: 'Silver Org',
      slug: `silver-${Date.now()}`,
    });
  });

  await run('Silver: 2nd workspace blocked', async () => {
    try {
      await orgsService.create(silverUser.id, {
        name: 'Silver Org 2',
        slug: `silver-2-${Date.now()}`,
      });
      throw new Error('Should fail');
    } catch (e) {
      if (!isLimitError(e)) throw e;
    }
  });

  await run('Silver upgrade popup shows only GOLD', async () => {
    try {
      await planLimit.assertWorkspaceLimit(silverUser.id);
      throw new Error('At limit');
    } catch (e) {
      if (!isLimitError(e)) throw e;
      const body = e.getResponse() as { upgradeTo: { plan: string }[] };
      if (body.upgradeTo.length !== 1 || body.upgradeTo[0].plan !== 'gold') {
        throw new Error('Expected only gold upgrade');
      }
    }
  });

  await run('Silver: 2GB storage boundary', async () => {
    await usersRepo.update(silverUser.id, {
      storageUsed: String(2 * GB - 500),
    });
    const ok = await planLimit.checkStorageLimit(silverUser.id, 200);
    if (!ok) throw new Error('Should allow under 2GB');
    await usersRepo.update(silverUser.id, { storageUsed: String(2 * GB) });
    const blocked = await planLimit.checkStorageLimit(silverUser.id, 1);
    if (blocked) throw new Error('Should block over 2GB');
    await usersRepo.update(silverUser.id, { storageUsed: '0' });
  });

  // ─── GOLD PLAN ───
  const goldUser = await createTestUser(usersService, 'gold');
  await plansService.activatePlan(goldUser.id, 'gold');

  await run('Plan upgraded to GOLD successfully', async () => {
    const u = await usersService.findById(goldUser.id);
    if (u?.currentPlan !== 'gold') throw new Error(`Not gold: ${u?.currentPlan}`);
  });

  await run('Gold: unlimited members check', async () => {
    const stats = await planLimit.getUsageStats(goldUser.id);
    if (stats.members.limit !== null) throw new Error('Gold members should be unlimited');
  });

  await run('Gold: 4GB storage boundary', async () => {
    await usersRepo.update(goldUser.id, { storageUsed: String(4 * GB) });
    const blocked = await planLimit.checkStorageLimit(goldUser.id, 1);
    if (blocked) throw new Error('Should block over 4GB');
    await usersRepo.update(goldUser.id, { storageUsed: '0' });
  });

  await run('Gold: no upgrade options at limit', async () => {
    for (let i = 0; i < 10; i++) {
      await orgsService.create(goldUser.id, {
        name: `Gold Org ${i}`,
        slug: `gold-${Date.now()}-${i}`,
      });
    }
    try {
      await orgsService.create(goldUser.id, {
        name: 'Gold Org overflow',
        slug: `gold-over-${Date.now()}`,
      });
      throw new Error('11th workspace should fail');
    } catch (e) {
      if (!isLimitError(e)) throw e;
      const body = e.getResponse() as { maximumPlan?: boolean; upgradeTo: unknown[] };
      if (body.upgradeTo.length > 0) throw new Error('Gold should have no upgrades');
      if (!body.maximumPlan) throw new Error('Should flag maximumPlan');
    }
  });

  // ─── EXPIRY ───
  await run('Expired plan downgraded to FREE', async () => {
    const expUser = await createTestUser(usersService, 'exp');
    await plansService.activatePlan(expUser.id, 'silver');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await usersRepo.update(expUser.id, { planExpiresAt: yesterday });
    const n = await plansService.downgradeExpiredUsers();
    if (n < 1) throw new Error('Expected at least one downgrade');
    const u = await usersRepo.findById(expUser.id);
    if (u?.currentPlan !== 'free') throw new Error('Should be free after expiry');
    await cleanupUser(usersRepo, orgsService, expUser.id);
  });

  await run('Expiry reminder hook runs', async () => {
    const n = await plansService.notifyExpiringSoon();
    if (typeof n !== 'number') throw new Error('Expected number');
  });

  // ─── EDGE CASES ───
  await run('Payment failed does not activate plan', async () => {
    const payUser = await createTestUser(usersService, 'pay-fail');
    try {
      await plansService.verifyPayment(payUser.id, {
        plan: 'silver',
        razorpay_order_id: 'order_invalid',
        razorpay_payment_id: 'pay_invalid',
        razorpay_signature: 'invalid_signature',
      });
      throw new Error('Should reject bad payment');
    } catch {
      const u = await usersRepo.findById(payUser.id);
      if (u?.currentPlan !== 'free') throw new Error('Plan should stay free');
    }
    await cleanupUser(usersRepo, orgsService, payUser.id);
  });

  await run('activatePlan sets silver', async () => {
    const payUser = await createTestUser(usersService, 'pay-ok');
    await plansService.activatePlan(payUser.id, 'silver');
    const u = await usersRepo.findById(payUser.id);
    if (u?.currentPlan !== 'silver') throw new Error('Should activate silver');
    await cleanupUser(usersRepo, orgsService, payUser.id);
  });

  await run('Existing workspace accessible after downgrade (read path)', async () => {
    const downUser = await createTestUser(usersService, 'down');
    await orgsService.create(downUser.id, {
      name: 'Keep Org',
      slug: `keep-${Date.now()}`,
    });
    await plansService.activatePlan(downUser.id, 'silver');
    await plansService.activatePlan(downUser.id, 'free');
    const orgs = await orgsService.findOrganizationsForUser(downUser.id);
    if (orgs.length < 1) throw new Error('Existing org should remain');
    const canCreate = await planLimit.checkWorkspaceLimit(downUser.id);
    if (canCreate) throw new Error('Should not allow new workspace on free with 1 org');
    await cleanupUser(usersRepo, orgsService, downUser.id);
  });

  // Cleanup
  await cleanupUser(usersRepo, orgsService, freeUser.id);
  await cleanupUser(usersRepo, orgsService, silverUser.id);
  await cleanupUser(usersRepo, orgsService, goldUser.id);

  return results;
}

export async function bootstrapPlanTests(): Promise<{
  app: INestApplicationContext;
  results: TestResult[];
}> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const results = await runAllPlanTests(app);
  return { app, results };
}
