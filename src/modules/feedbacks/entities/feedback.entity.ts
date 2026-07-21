import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';

export interface FeedbackMediaMeta {
  id: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number;
  storageKey: string;
}

@Entity('feedbacks')
@Index('idx_feedbacks_org_created', ['organizationId', 'createdAt'])
@Index('idx_feedbacks_user_created', ['userId', 'createdAt'])
export class FeedbackEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  @Column({ name: 'user_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'json', nullable: true })
  media!: FeedbackMediaMeta[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;
}
