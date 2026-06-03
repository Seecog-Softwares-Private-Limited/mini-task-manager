import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CouponCodeEntity } from '../entities/coupon-code.entity';
import { CouponRedemptionEntity } from '../entities/coupon-redemption.entity';

@Injectable()
export class CouponCodesRepository {
  constructor(
    @InjectRepository(CouponCodeEntity)
    private readonly couponRepo: Repository<CouponCodeEntity>,
    @InjectRepository(CouponRedemptionEntity)
    private readonly redemptionRepo: Repository<CouponRedemptionEntity>,
  ) {}

  findAll(): Promise<CouponCodeEntity[]> {
    return this.couponRepo.find({ order: { createdAt: 'DESC' } });
  }

  findById(id: string): Promise<CouponCodeEntity | null> {
    return this.couponRepo.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<CouponCodeEntity | null> {
    return this.couponRepo.findOne({
      where: { code: code.trim().toUpperCase() },
    });
  }

  save(entity: CouponCodeEntity): Promise<CouponCodeEntity> {
    return this.couponRepo.save(entity);
  }

  async incrementRedemption(id: string): Promise<void> {
    await this.couponRepo.increment({ id }, 'redemptionCount', 1);
  }

  hasUserRedeemed(couponId: string, userId: string): Promise<boolean> {
    return this.redemptionRepo
      .exist({ where: { couponId, userId } })
      .then(Boolean);
  }

  saveRedemption(data: Partial<CouponRedemptionEntity>): Promise<CouponRedemptionEntity> {
    const row = this.redemptionRepo.create(data);
    return this.redemptionRepo.save(row);
  }
}
