import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { readFileSync } from 'fs';
import {
  AppStoreServerAPIClient,
  Environment,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from '@apple/app-store-server-library';
import { planSlugFromAppleProductId } from '../config/apple-iap.config';
import type { UserPlanSlug } from '../config/plans.config';

export interface VerifiedAppleTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  plan: UserPlanSlug;
  expiresAt: Date | null;
  purchasedAt: Date | null;
  environment: string;
  revocationDate: Date | null;
}

@Injectable()
export class AppleIapService {
  private readonly logger = new Logger(AppleIapService.name);
  private readonly apiClients = new Map<Environment, AppStoreServerAPIClient>();
  private readonly bundleId: string;
  private readonly primaryEnvironment: Environment;
  private readonly fallbackSandbox: boolean;
  private readonly enabled: boolean;

  constructor() {
    this.bundleId =
      process.env.APPLE_IAP_BUNDLE_ID?.trim() ||
      'com.seecog.minitaskmanager.miniTaskManager';
    const envName = (process.env.APPLE_IAP_ENVIRONMENT || 'Sandbox').trim();
    this.primaryEnvironment =
      envName.toLowerCase() === 'production'
        ? Environment.PRODUCTION
        : Environment.SANDBOX;
    this.fallbackSandbox =
      String(process.env.APPLE_IAP_FALLBACK_SANDBOX ?? 'true').toLowerCase() !==
      'false';

    const issuerId = process.env.APPLE_IAP_ISSUER_ID?.trim() || '';
    const keyId = process.env.APPLE_IAP_KEY_ID?.trim() || '';
    const privateKey = this.loadPrivateKey();
    this.enabled = Boolean(issuerId && keyId && privateKey);

    if (!this.enabled) {
      this.logger.warn(
        'Apple IAP is not fully configured (APPLE_IAP_ISSUER_ID / KEY_ID / PRIVATE_KEY). ' +
          'Purchase verification will fail until credentials are set.',
      );
      return;
    }

    for (const environment of [Environment.SANDBOX, Environment.PRODUCTION]) {
      this.apiClients.set(
        environment,
        new AppStoreServerAPIClient(
          privateKey!,
          keyId,
          issuerId,
          this.bundleId,
          environment,
        ),
      );
    }
  }

  isConfigured(): boolean {
    return this.enabled;
  }

  private loadPrivateKey(): string | null {
    const inline = process.env.APPLE_IAP_PRIVATE_KEY?.trim();
    if (inline) {
      return inline.replace(/\\n/g, '\n');
    }
    const path = process.env.APPLE_IAP_PRIVATE_KEY_PATH?.trim();
    if (path) {
      try {
        return readFileSync(path, 'utf8');
      } catch (err) {
        this.logger.error(`Failed to read APPLE_IAP_PRIVATE_KEY_PATH=${path}: ${err}`);
        return null;
      }
    }
    return null;
  }

  private environmentsToTry(): Environment[] {
    if (this.primaryEnvironment === Environment.PRODUCTION && this.fallbackSandbox) {
      return [Environment.PRODUCTION, Environment.SANDBOX];
    }
    if (this.primaryEnvironment === Environment.SANDBOX) {
      return [Environment.SANDBOX, Environment.PRODUCTION];
    }
    return [this.primaryEnvironment];
  }

  /**
   * Verify a purchase by looking up the transaction via App Store Server API.
   * Optionally uses a client-provided JWS to obtain the transaction id first.
   */
  async verifyTransaction(params: {
    transactionId: string;
    signedTransaction?: string;
    productId?: string;
  }): Promise<VerifiedAppleTransaction> {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'Apple In-App Purchase is not configured on the server',
      );
    }

    let transactionId = params.transactionId.trim();
    if (!transactionId && params.signedTransaction?.trim()) {
      const local = this.decodeJwsPayload<JWSTransactionDecodedPayload>(
        params.signedTransaction.trim(),
      );
      transactionId = String(local.transactionId || '');
    }
    if (!transactionId) {
      throw new BadRequestException('transactionId is required');
    }

    const { payload, environment } = await this.fetchTransaction(transactionId);
    return this.toVerified(payload, environment, params.productId);
  }

  /** Decode ASN V2 signed payload (outer JWS) without local Apple root certs. */
  decodeNotification(signedPayload: string): ResponseBodyV2DecodedPayload {
    return this.decodeJwsPayload<ResponseBodyV2DecodedPayload>(signedPayload);
  }

  decodeSignedTransactionInfo(
    signedTransactionInfo: string,
  ): JWSTransactionDecodedPayload {
    return this.decodeJwsPayload<JWSTransactionDecodedPayload>(
      signedTransactionInfo,
    );
  }

  private async fetchTransaction(
    transactionId: string,
  ): Promise<{ payload: JWSTransactionDecodedPayload; environment: Environment }> {
    const errors: string[] = [];
    for (const environment of this.environmentsToTry()) {
      const client = this.apiClients.get(environment);
      if (!client) continue;
      try {
        const response = await client.getTransactionInfo(transactionId);
        if (!response.signedTransactionInfo) {
          throw new Error('Missing signedTransactionInfo');
        }
        const payload = this.decodeJwsPayload<JWSTransactionDecodedPayload>(
          response.signedTransactionInfo,
        );
        return { payload, environment };
      } catch (err) {
        errors.push(
          `${environment}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    throw new BadRequestException(
      `Apple transaction not found or invalid (${errors.join('; ')})`,
    );
  }

  toVerified(
    decoded: JWSTransactionDecodedPayload,
    environment: Environment | string,
    expectedProductId?: string,
  ): VerifiedAppleTransaction {
    const productId = decoded.productId?.trim() || '';
    if (!productId) {
      throw new BadRequestException('Apple transaction missing productId');
    }
    if (expectedProductId && expectedProductId !== productId) {
      throw new BadRequestException('Product id does not match Apple transaction');
    }
    if (decoded.bundleId && decoded.bundleId !== this.bundleId) {
      throw new BadRequestException('Bundle id does not match this app');
    }

    const plan = planSlugFromAppleProductId(productId);
    if (!plan) {
      throw new BadRequestException(`Unsupported Apple product: ${productId}`);
    }

    const transactionId = String(decoded.transactionId || '');
    const originalTransactionId = String(
      decoded.originalTransactionId || decoded.transactionId || '',
    );
    if (!transactionId || !originalTransactionId) {
      throw new BadRequestException('Apple transaction missing identifiers');
    }

    const expiresAt =
      typeof decoded.expiresDate === 'number' ? new Date(decoded.expiresDate) : null;
    const purchasedAt =
      typeof decoded.purchaseDate === 'number'
        ? new Date(decoded.purchaseDate)
        : null;
    const revocationDate =
      typeof decoded.revocationDate === 'number'
        ? new Date(decoded.revocationDate)
        : null;

    if (revocationDate) {
      throw new BadRequestException('Apple transaction was revoked or refunded');
    }
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Apple subscription has expired');
    }

    return {
      transactionId,
      originalTransactionId,
      productId,
      plan,
      expiresAt,
      purchasedAt,
      environment: String(environment),
      revocationDate,
    };
  }

  decodeJwsPayload<T>(jws: string): T {
    const parts = jws.split('.');
    if (parts.length < 2) {
      throw new BadRequestException('Malformed JWS');
    }
    const json = Buffer.from(
      parts[1].replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    try {
      return JSON.parse(json) as T;
    } catch {
      throw new BadRequestException('Malformed JWS payload');
    }
  }
}
