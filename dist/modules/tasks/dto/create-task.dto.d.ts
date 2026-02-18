declare class CreateTaskSubtaskDto {
    id?: string;
    title: string;
    completed?: boolean;
    assigneeId?: string;
    dueDate?: string;
    priority?: string;
}
export declare class CreateTaskDto {
    projectId: string;
    organizationId: string;
    title: string;
    description?: string;
    statusId?: string;
    priority?: string;
    assigneeId?: string;
    assigneeIds?: string[];
    parentTaskId?: string;
    sprintId?: string;
    subtasks?: CreateTaskSubtaskDto[];
}
export {};
