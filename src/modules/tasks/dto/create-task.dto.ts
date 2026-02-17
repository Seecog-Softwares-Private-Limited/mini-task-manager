import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  projectId!: string;

  @IsString()
  organizationId!: string;

  @IsString()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  statusId?: string;

  @IsOptional()
  priority?: string;

  @IsOptional()
  assigneeId?: string;

  @IsOptional()
  parentTaskId?: string;

  @IsOptional()
  sprintId?: string;
}
