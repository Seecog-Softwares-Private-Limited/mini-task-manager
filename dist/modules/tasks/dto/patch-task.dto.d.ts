declare class PatchTaskSubtaskDto {
    id?: string;
    title: string;
    completed?: boolean;
    assigneeId?: string;
    dueDate?: string;
    priority?: string;
}
export declare class PatchTaskDto {
    title?: string;
    description?: string;
    statusId?: string | null;
    subtasks?: PatchTaskSubtaskDto[];
}
export {};
