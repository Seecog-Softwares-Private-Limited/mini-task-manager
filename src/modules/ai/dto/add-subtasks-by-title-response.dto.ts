export class AddSubtasksByTitleResponseDto {
  taskId!: string;
  projectId!: string;
  title!: string;
  addedCount!: number;
  skippedTitles!: string[];
  totalSubtasks!: number;
}
