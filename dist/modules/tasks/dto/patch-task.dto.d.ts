declare class PatchTaskSubtaskDto {
    id?: string;
    title: string;
    completed?: boolean;
    assigneeId?: string;
    dueDate?: string;
    priority?: string;
}
declare class PatchTaskTagDto {
    name: string;
    color: string;
}
export declare class PatchTaskDto {
    title?: string;
    description?: string;
    statusId?: string | null;
    sprintId?: string | null;
    assigneeId?: string | null;
    dueDate?: string | null;
    priority?: string;
    storyPoints?: number | null;
    tags?: PatchTaskTagDto[];
    subtasks?: PatchTaskSubtaskDto[];
}
export {};
