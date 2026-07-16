import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Configuration } from '../../config/configuration';
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

  private initFirebase(): void {
    if (getApps().length > 0) {
      this.ready = true;
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
        this.logger.warn(
          'Firebase Admin not configured (set FIREBASE_SERVICE_ACCOUNT_PATH or place config/firebase-service-account.json). Push disabled.',
        );
        return;
      }

      initializeApp({
        credential: cert(credential),
      });
      this.ready = true;
      this.logger.log('Firebase Admin initialized');
    } catch (err) {
      this.logger.error(`Firebase Admin init failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Send FCM to all registered devices for a user.
   * Invalid tokens are removed. Never throws to callers.
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.ready) return;

    const tokens = await this.deviceTokensRepository.findByUserId(userId);
    if (tokens.length === 0) {
      this.logger.log(`No FCM tokens for user ${userId}; skipping push for "${title}"`);
      return;
    }

    const payloadData: Record<string, string> = {
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      open: 'alerts',
      ...(data ?? {}),
    };

    const messaging = getMessaging();

    await Promise.all(
      tokens.map(async (row) => {
        try {
          await messaging.send({
            token: row.token,
            notification: { title, body },
            data: payloadData,
            android: { priority: 'high' },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                },
              },
            },
          });
        } catch (err: unknown) {
          const code =
            err && typeof err === 'object' && 'code' in err
              ? String((err as { code: string }).code)
              : '';
          const invalid =
            code.includes('registration-token-not-registered') ||
            code.includes('invalid-registration-token') ||
            code.includes('invalid-argument');
          if (invalid) {
            this.logger.warn(`Removing invalid FCM token for user ${userId}`);
            await this.deviceTokensRepository.deleteByToken(row.token);
          } else {
            this.logger.warn(
              `FCM send failed for user ${userId}: ${err instanceof Error ? err.message : err}`,
            );
          }
        }
      }),
    );
  }
}
