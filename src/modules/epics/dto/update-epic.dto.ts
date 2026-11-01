import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class UpdateEpicDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsIn(['TODO', 'IN_PROGRESS', 'DONE'])
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';

  @IsOptional()
  startDate?: string;

  @IsOptional()
  dueDate?: string;
}
