import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateSprintDto {
  @IsString()
  projectId!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;

  @IsOptional()
  status?: string;
}
