export declare class CreateTaskDto {
    projectId: string;
    organizationId: string;
    title: string;
    description?: string;
    statusId?: string;
    priority?: string;
    assigneeId?: string;
    parentTaskId?: string;
    sprintId?: string;
}
