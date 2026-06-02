import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity, uuidBinaryTransformer } from '../../../common/base.entity';

@Entity('notification_logs')
export class NotificationLogEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'target_scope', type: 'varchar', length: 30 })
  targetScope!: 'single' | 'multiple' | 'all';

  @Column({ name: 'target_organization_ids', type: 'json', nullable: true })
  targetOrganizationIds!: string[] | null;

  @Column({ name: 'title', type: 'varchar', length: 200 })
  title!: string;

  @Column({ name: 'message', type: 'text' })
  message!: string;

  @Column({ name: 'sent_by', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  sentBy!: string;
}

