import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import type { UserPlanSlug } from '../../config/plans.config';

@Entity('plan_configurations')
@Index('ux_plan_configurations_plan_name', ['planName'], { unique: true })
export class PlanConfigurationEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'plan_name', type: 'varchar', length: 20 })
  planName!: UserPlanSlug;

  @Column({ name: 'max_users', type: 'int', unsigned: true, nullable: true })
  maxUsers!: number | null;

  @Column({ name: 'max_storage', type: 'bigint', unsigned: true })
  maxStorage!: string;

  @Column({ name: 'max_workspaces', type: 'int', unsigned: true, nullable: true })
  maxWorkspaces!: number | null;
}

