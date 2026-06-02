import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { uuidBinaryTransformer } from '../../../common/base.entity';

@Entity('super_admins')
export class SuperAdminEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'user_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer, unique: true })
  userId!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}

