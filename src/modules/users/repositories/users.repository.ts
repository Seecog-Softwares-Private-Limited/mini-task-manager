import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateUuid } from '../../../common/utils/uuid.util';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findByGoogleId(googleId: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { googleId } });
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { phone } });
  }

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const id = data.id ?? generateUuid();
    const entity = this.repo.create({ ...data, id });
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<UserEntity>): Promise<void> {
    await this.repo.update(id, data);
  }

  /** Updates last_seen_at for presence. Call on each authenticated request. */
  async updateLastSeen(userId: string): Promise<void> {
    await this.repo.update(userId, { lastSeenAt: new Date() });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async incrementStorageUsed(userId: string, bytes: number): Promise<void> {
    await this.repo.increment({ id: userId }, 'storageUsed', bytes);
  }

  async decrementStorageUsed(userId: string, bytes: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(UserEntity)
      .set({
        storageUsed: () => `GREATEST(0, CAST(storage_used AS SIGNED) - ${Math.floor(bytes)})`,
      })
      .where('id = :id', { id: userId })
      .execute();
  }

  async findWithExpiredPaidPlan(): Promise<UserEntity[]> {
    return this.repo
      .createQueryBuilder('u')
      .where('u.current_plan IN (:...plans)', { plans: ['silver', 'gold'] })
      .andWhere('u.plan_expires_at IS NOT NULL')
      .andWhere('u.plan_expires_at < :now', { now: new Date() })
      .getMany();
  }

  async findPlansExpiringWithinDays(days: number): Promise<UserEntity[]> {
    const now = new Date();
    const until = new Date();
    until.setDate(until.getDate() + days);
    return this.repo
      .createQueryBuilder('u')
      .where('u.current_plan IN (:...plans)', { plans: ['silver', 'gold'] })
      .andWhere('u.plan_expires_at IS NOT NULL')
      .andWhere('u.plan_expires_at > :now', { now })
      .andWhere('u.plan_expires_at <= :until', { until })
      .getMany();
  }
}
