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

@Entity('device_tokens')
@Index('idx_device_tokens_user', ['userId'])
@Index('uq_device_tokens_token', ['token'], { unique: true })
export class DeviceTokenEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'user_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  userId!: string;

  @Column({ type: 'varchar', length: 1024 })
  token!: string;

  @Column({ type: 'varchar', length: 16 })
  platform!: string;

  @Column({ name: 'device_id', type: 'varchar', length: 255, nullable: true })
  deviceId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}
