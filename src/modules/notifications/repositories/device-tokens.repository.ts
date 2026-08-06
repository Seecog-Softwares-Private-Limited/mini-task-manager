import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { DeviceTokenEntity } from '../entities/device-token.entity';

/** Keep at most this many tokens per user+platform (latest by updatedAt). */
const MAX_TOKENS_PER_PLATFORM = 2;

@Injectable()
export class DeviceTokensRepository {
  constructor(
    @InjectRepository(DeviceTokenEntity)
    private readonly repo: Repository<DeviceTokenEntity>,
  ) {}

  async findByToken(token: string): Promise<DeviceTokenEntity | null> {
    return this.repo.findOne({ where: { token } });
  }

  async findByUserId(userId: string): Promise<DeviceTokenEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  async findByUserAndDevice(
    userId: string,
    deviceId: string,
  ): Promise<DeviceTokenEntity | null> {
    return this.repo.findOne({ where: { userId, deviceId } });
  }

  /**
   * Register / refresh an FCM token.
   * - Same FCM token → update owner/platform.
   * - Same physical device (deviceId) → replace token (avoids pile-up on refresh).
   * - Then prune old tokens so each user keeps a small set of live devices.
   */
  async upsert(data: {
    userId: string;
    token: string;
    platform: string;
    deviceId?: string | null;
  }): Promise<DeviceTokenEntity> {
    const deviceId =
      data.deviceId && data.deviceId.trim().length > 0
        ? data.deviceId.trim()
        : null;

    const byToken = await this.findByToken(data.token);
    if (byToken) {
      byToken.userId = data.userId;
      byToken.platform = data.platform;
      if (deviceId !== null) {
        byToken.deviceId = deviceId;
      }
      const saved = await this.repo.save(byToken);
      await this.pruneForUser(data.userId);
      return saved;
    }

    if (deviceId) {
      const byDevice = await this.findByUserAndDevice(data.userId, deviceId);
      if (byDevice) {
        byDevice.token = data.token;
        byDevice.platform = data.platform;
        const saved = await this.repo.save(byDevice);
        await this.pruneForUser(data.userId);
        return saved;
      }
    }

    const entity = this.repo.create({
      id: generateUuid(),
      userId: data.userId,
      token: data.token,
      platform: data.platform,
      deviceId,
    });
    const saved = await this.repo.save(entity);
    await this.pruneForUser(data.userId);
    return saved;
  }

  /**
   * Drop surplus rows so assignment pushes don't fan out to many ghost devices.
   * Keeps the newest MAX_TOKENS_PER_PLATFORM tokens for each platform.
   */
  async pruneForUser(userId: string): Promise<void> {
    const rows = await this.repo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
    if (rows.length === 0) return;

    const keep = new Set<string>();
    const countByPlatform = new Map<string, number>();

    for (const row of rows) {
      const platform = (row.platform || 'unknown').toLowerCase();
      const used = countByPlatform.get(platform) ?? 0;
      if (used < MAX_TOKENS_PER_PLATFORM) {
        keep.add(row.id);
        countByPlatform.set(platform, used + 1);
      }
    }

    const staleIds = rows.filter((r) => !keep.has(r.id)).map((r) => r.id);
    if (staleIds.length === 0) return;
    await this.repo.createQueryBuilder().delete().whereInIds(staleIds).execute();
  }

  async deleteByToken(token: string): Promise<void> {
    await this.repo.delete({ token });
  }

  async deleteByTokenAndUser(token: string, userId: string): Promise<void> {
    await this.repo.delete({ token, userId });
  }
}
