import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../common/base.entity';

@Entity('platform_settings')
export class PlatformSettingEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'setting_key', type: 'varchar', length: 120, unique: true })
  settingKey!: string;

  @Column({ name: 'setting_value', type: 'json', nullable: true })
  settingValue!: Record<string, unknown> | string | number | boolean | null;
}

