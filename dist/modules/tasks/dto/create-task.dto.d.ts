declare class CreateTaskSubtaskDto {
    id?: string;
    title: string;
    completed?: boolean;
    assigneeId?: string;
    dueDate?: string;
    priority?: string;
    statusId?: string;
}
declare class CreateTaskTagDto {
    name: string;
    color: string;
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
    tags?: CreateTaskTagDto[];
    subtasks?: CreateTaskSubtaskDto[];
}
export {};
