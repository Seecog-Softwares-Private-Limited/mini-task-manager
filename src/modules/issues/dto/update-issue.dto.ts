import { Allow, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateIssueDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

  /** Empty string clears the assignee. */
  @Allow()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  resolutionNote?: string;
}
