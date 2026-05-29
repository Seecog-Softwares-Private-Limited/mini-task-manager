import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const normalizeCreateDueDate = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  return value;
};

class CreateTaskSubtaskDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsUUID('4')
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: string;

  @IsOptional()
  @IsUUID('4')
  statusId?: string;
}

class CreateTaskTagDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsString()
  @MaxLength(20)
  color!: string;
}

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
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeIds?: string[];

  @IsOptional()
  parentTaskId?: string;

  @IsOptional()
  sprintId?: string;

  @IsOptional()
  @Transform(normalizeCreateDueDate)
  @ValidateIf((_o, v) => v !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dueDate must be YYYY-MM-DD' })
  dueDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  storyPoints?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskTagDto)
  tags?: CreateTaskTagDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskSubtaskDto)
  subtasks?: CreateTaskSubtaskDto[];
}
