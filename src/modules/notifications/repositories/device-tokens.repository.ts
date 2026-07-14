import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { DeviceTokenEntity } from '../entities/device-token.entity';

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

  async upsert(data: {
    userId: string;
    token: string;
    platform: string;
    deviceId?: string | null;
  }): Promise<DeviceTokenEntity> {
    const existing = await this.findByToken(data.token);
    if (existing) {
      existing.userId = data.userId;
      existing.platform = data.platform;
      if (data.deviceId !== undefined) {
        existing.deviceId = data.deviceId ?? null;
      }
      return this.repo.save(existing);
    }

    const entity = this.repo.create({
      id: generateUuid(),
      userId: data.userId,
      token: data.token,
      platform: data.platform,
      deviceId: data.deviceId ?? null,
    });
    return this.repo.save(entity);
  }

  async deleteByToken(token: string): Promise<void> {
    await this.repo.delete({ token });
  }

  async deleteByTokenAndUser(token: string, userId: string): Promise<void> {
    await this.repo.delete({ token, userId });
  }
}
