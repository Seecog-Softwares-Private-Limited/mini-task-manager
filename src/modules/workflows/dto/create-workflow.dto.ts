import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  projectId!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
