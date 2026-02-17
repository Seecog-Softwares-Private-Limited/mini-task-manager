import { Entity, PrimaryColumn, Column } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';

@Entity('plans')
export class PlanEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'price_per_user', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerUser!: string | null;

  @Column({ name: 'billing_cycle', type: 'varchar', length: 50 })
  billingCycle!: string;

  @Column({ name: 'max_projects', type: 'int', nullable: true })
  maxProjects!: number | null;

  @Column({ name: 'max_members', type: 'int', nullable: true })
  maxMembers!: number | null;

  @Column({ type: 'json', nullable: true })
  features!: Record<string, unknown> | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
