import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';
import { BaseEntity } from '../../../common/base.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('organizations')
export class OrganizationEntity extends BaseEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  slug!: string;

  @Column({ name: 'logo_url', type: 'mediumtext', nullable: true })
  logoUrl!: string | null;

  @Column({ name: 'owner_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  ownerId!: string;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: 'ACTIVE' | 'SUSPENDED' | 'DELETED';

  @Column({ name: 'suspended_at', type: 'timestamp', nullable: true })
  suspendedAt!: Date | null;

  @Column({ name: 'suspension_reason', type: 'text', nullable: true })
  suspensionReason!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner?: UserEntity;
}
