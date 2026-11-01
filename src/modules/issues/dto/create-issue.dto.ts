import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIssueDto {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  siteId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  subtaskId?: string;

  @IsString()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsOptional()
  @IsString()
  assigneeId?: string;
}
