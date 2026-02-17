import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';

@Entity('sprints')
export class SprintEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'project_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  projectId!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'PLANNED' })
  status!: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;
}
