import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';
import { TaskEntity } from '../../tasks/entities/task.entity';
import { CustomFieldEntity } from './custom-field.entity';

@Entity('task_custom_field_values')
export class TaskCustomFieldValueEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'task_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  taskId!: string;

  @Column({ name: 'custom_field_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  customFieldId!: string;

  @Column({ type: 'text', nullable: true })
  value!: string | null;

  @ManyToOne(() => TaskEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task?: TaskEntity;

  @ManyToOne(() => CustomFieldEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'custom_field_id' })
  customField?: CustomFieldEntity;
}
