import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging, type MulticastMessage } from 'firebase-admin/messaging';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Configuration } from '../../config/configuration';
import { formatUuid } from '../../common/utils/uuid.util';
import { DeviceTokensRepository } from './repositories/device-tokens.repository';

@Injectable()
export class PushNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationsService.name);
  private ready = false;

  constructor(
    private readonly config: ConfigService<Configuration>,
    private readonly deviceTokensRepository: DeviceTokensRepository,
  ) {}

  onModuleInit(): void {
    this.initFirebase();
  }

  isReady(): boolean {
    return this.ready;
  }

  private initFirebase(): void {
    if (getApps().length > 0) {
      this.ready = true;
      this.logger.log('Firebase Admin already initialized');
      return;
    }

    const firebaseCfg = this.config.get('firebase', { infer: true });
    const jsonEnv = firebaseCfg?.serviceAccountJson?.trim();
    const pathEnv = firebaseCfg?.serviceAccountPath?.trim();

    try {
      let credential: ServiceAccount | undefined;

      if (jsonEnv) {
        credential = JSON.parse(jsonEnv) as ServiceAccount;
      } else {
        const candidates = [
          pathEnv,
          join(process.cwd(), 'config', 'firebase-service-account.json'),
          join(process.cwd(), 'config', 'firebase-service.json'),
        ].filter((p): p is string => !!p && p.length > 0);

        for (const path of candidates) {
          if (existsSync(path)) {
            credential = JSON.parse(readFileSync(path, 'utf8')) as ServiceAccount;
            this.logger.log(`Firebase Admin loaded from ${path}`);
            break;
          }
        }
      }

      if (!credential) {
        this.logger.error(
          'Firebase Admin not configured (set FIREBASE_SERVICE_ACCOUNT_PATH or place config/firebase-service-account.json). Push notifications are DISABLED until this is fixed.',
        );
        return;
      }

      initializeApp({
        credential: cert(credential),
      });
      this.ready = true;
      this.logger.log('Firebase Admin initialized — push notifications enabled');
    } catch (err) {
      this.logger.error(
        `Firebase Admin init failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * Send FCM to all registered Android/iOS devices for a user.
   * Invalid tokens are removed. Never throws to callers.
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const normalizedUserId = formatUuid(userId) ?? userId;

    if (!this.ready) {
      this.logger.error(
        `Push skipped for "${title}" (user ${normalizedUserId}): Firebase Admin is not configured on this server`,
      );
      return;
    }

    const rows = await this.deviceTokensRepository.findByUserId(normalizedUserId);
    if (rows.length === 0) {
      this.logger.warn(
        `No FCM tokens for user ${normalizedUserId}; skipping push for "${title}". User must open the Android/iOS app once and allow notifications.`,
      );
      return;
    }

    // Deduplicate tokens (same device re-registered).
    const tokens = [...new Set(rows.map((r) => r.token).filter((t) => !!t?.trim()))];
    this.logger.log(
      `Sending FCM push "${title}" to ${tokens.length} device(s) for user ${normalizedUserId}`,
    );

    const payloadData: Record<string, string> = {};
    // FCM data values must be strings.
    const rawData = {
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      open: 'alerts',
      ...(data ?? {}),
    };
    for (const [key, value] of Object.entries(rawData)) {
      if (value == null) continue;
      payloadData[key] = String(value);
    }

    const message: MulticastMessage = {
      tokens,
      notification: { title, body },
      data: payloadData,
      android: {
        priority: 'high',
        notification: {
          channelId: 'high_importance_channel',
          sound: 'default',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            badge: 1,
            'content-available': 1,
          },
        },
      },
    };

    try {
      await this.sendMulticastWithRetry(message, normalizedUserId);
    } catch (err) {
      this.logger.error(
        `FCM multicast failed for user ${normalizedUserId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      // Fallback: try one-by-one so one bad token cannot block the rest.
      await this.sendIndividually(tokens, message, normalizedUserId);
    }
  }

  private async sendMulticastWithRetry(
    message: MulticastMessage,
    userId: string,
  ): Promise<void> {
    const messaging = getMessaging();
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await messaging.sendEachForMulticast(message);
        this.logger.log(
          `FCM result for user ${userId}: ${response.successCount} ok, ${response.failureCount} failed`,
        );

        if (response.failureCount > 0) {
          await this.cleanupFailedTokens(message.tokens, response.responses, userId);
        }
        return;
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `FCM multicast attempt ${attempt} failed for user ${userId}: ${
            err instanceof Error ? err.message : err
          }`,
        );
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    throw lastError;
  }

  private async sendIndividually(
    tokens: string[],
    base: MulticastMessage,
    userId: string,
  ): Promise<void> {
    const messaging = getMessaging();
    await Promise.all(
      tokens.map(async (token) => {
        try {
          await messaging.send({
            token,
            notification: base.notification,
            data: base.data,
            android: base.android,
            apns: base.apns,
          });
        } catch (err: unknown) {
          if (this.isInvalidTokenError(err)) {
            this.logger.warn(`Removing invalid FCM token for user ${userId}`);
            await this.deviceTokensRepository.deleteByToken(token);
          } else {
            this.logger.warn(
              `FCM send failed for user ${userId}: ${
                err instanceof Error ? err.message : err
              }`,
            );
          }
        }
      }),
    );
  }

  private async cleanupFailedTokens(
    tokens: string[],
    responses: Array<{ success: boolean; error?: { code?: string; message?: string } }>,
    userId: string,
  ): Promise<void> {
    await Promise.all(
      responses.map(async (res, index) => {
        if (res.success) return;
        const token = tokens[index];
        if (!token) return;
        const code = res.error?.code ?? '';
        if (this.isInvalidTokenCode(code)) {
          this.logger.warn(
            `Removing invalid FCM token for user ${userId} (${code})`,
          );
          await this.deviceTokensRepository.deleteByToken(token);
        } else {
          this.logger.warn(
            `FCM failure for user ${userId}: ${code || res.error?.message || 'unknown'}`,
          );
        }
      }),
    );
  }

  private isInvalidTokenError(err: unknown): boolean {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: string }).code)
        : '';
    return this.isInvalidTokenCode(code);
  }

  private isInvalidTokenCode(code: string): boolean {
    return (
      code.includes('registration-token-not-registered') ||
      code.includes('invalid-registration-token') ||
      code.includes('invalid-argument')
    );
  }
}
