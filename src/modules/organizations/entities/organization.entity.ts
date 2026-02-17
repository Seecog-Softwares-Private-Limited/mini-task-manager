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

  @Column({ name: 'owner_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  ownerId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner?: UserEntity;
}
