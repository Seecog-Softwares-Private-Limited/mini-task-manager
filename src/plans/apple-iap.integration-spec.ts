import {
  planSlugFromAppleProductId,
  appleProductIdForPlan,
  APPLE_IAP_PRODUCTS,
} from '../config/apple-iap.config';
import { AppleIapService } from './apple-iap.service';

describe('apple-iap.config', () => {
  it('maps product ids to plan slugs', () => {
    expect(planSlugFromAppleProductId(APPLE_IAP_PRODUCTS.SILVER_MONTHLY)).toBe('silver');
    expect(planSlugFromAppleProductId(APPLE_IAP_PRODUCTS.GOLD_MONTHLY)).toBe('gold');
    expect(planSlugFromAppleProductId('unknown')).toBeNull();
  });

  it('maps plan slugs to product ids', () => {
    expect(appleProductIdForPlan('silver')).toBe(APPLE_IAP_PRODUCTS.SILVER_MONTHLY);
    expect(appleProductIdForPlan('gold')).toBe(APPLE_IAP_PRODUCTS.GOLD_MONTHLY);
    expect(appleProductIdForPlan('free')).toBeNull();
  });
});

describe('AppleIapService.decodeJwsPayload', () => {
  const service = new AppleIapService();

  it('decodes a JWS payload segment', () => {
    const payload = {
      transactionId: '1000000123456789',
      originalTransactionId: '1000000123456789',
      productId: APPLE_IAP_PRODUCTS.SILVER_MONTHLY,
      bundleId: 'com.seecog.minitaskmanager.miniTaskManager',
      expiresDate: Date.now() + 60_000,
      purchaseDate: Date.now(),
    };
    const header = Buffer.from(JSON.stringify({ alg: 'ES256' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const jws = `${header}.${body}.signature`;

    const decoded = service.decodeJwsPayload<typeof payload>(jws);
    expect(decoded.transactionId).toBe(payload.transactionId);
    expect(decoded.productId).toBe(payload.productId);
  });

  it('validates bundle and product when converting to verified transaction', () => {
    const expires = Date.now() + 86_400_000;
    const verified = service.toVerified(
      {
        transactionId: '200',
        originalTransactionId: '100',
        productId: APPLE_IAP_PRODUCTS.GOLD_MONTHLY,
        bundleId: 'com.seecog.minitaskmanager.miniTaskManager',
        expiresDate: expires,
        purchaseDate: Date.now(),
      },
      'Sandbox',
    );
    expect(verified.plan).toBe('gold');
    expect(verified.originalTransactionId).toBe('100');
    expect(verified.expiresAt?.getTime()).toBe(expires);
  });

  it('rejects expired subscriptions', () => {
    expect(() =>
      service.toVerified(
        {
          transactionId: '200',
          originalTransactionId: '100',
          productId: APPLE_IAP_PRODUCTS.SILVER_MONTHLY,
          bundleId: 'com.seecog.minitaskmanager.miniTaskManager',
          expiresDate: Date.now() - 1_000,
          purchaseDate: Date.now() - 86_400_000,
        },
        'Sandbox',
      ),
    ).toThrow('expired');
  });
});
