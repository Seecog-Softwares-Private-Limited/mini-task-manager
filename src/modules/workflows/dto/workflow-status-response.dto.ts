export class WorkflowStatusResponseDto {
  id!: string;
  workflowId!: string;
  name!: string;
  position!: number;
  color?: string;
  type!: string;
}
