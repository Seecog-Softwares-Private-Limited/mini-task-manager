import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';
import { ProjectEntity } from './project.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('project_members')
export class ProjectMemberEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'project_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  projectId!: string;

  @Column({ name: 'user_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  role!: string;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}
