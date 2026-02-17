import { BaseEntity } from '../../../common/base.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { WorkflowStatusEntity } from '../../workflows/entities/workflow-status.entity';
import { SprintEntity } from '../../sprints/entities/sprint.entity';
export declare class TaskEntity extends BaseEntity {
    id: string;
    projectId: string;
    organizationId: string;
    title: string;
    description: string | null;
    statusId: string | null;
    priority: string;
    assigneeId: string | null;
    reporterId: string;
    parentTaskId: string | null;
    storyPoints: number | null;
    dueDate: Date | null;
    estimatedMinutes: number | null;
    loggedMinutes: number;
    sprintId: string | null;
    project?: ProjectEntity;
    status?: WorkflowStatusEntity;
    assignee?: UserEntity;
    reporter?: UserEntity;
    parentTask?: TaskEntity;
    sprint?: SprintEntity;
}
