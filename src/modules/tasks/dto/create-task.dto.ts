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
import { TaskRecurrenceDto } from './recurrence.dto';

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

  /** Days after the run due date when this checklist item is due (recurring templates). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  dueOffsetDays?: number;

  /** Optional time of day (HH:mm) applied when the run is generated. */
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  dueTime?: string;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: string;

  @IsOptional()
  @IsIn(['TODO', 'IN_PROGRESS', 'DONE'])
  status?: string;

  @IsOptional()
  @IsUUID('4')
  statusId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
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

  @IsOptional()
  @ValidateNested()
  @Type(() => TaskRecurrenceDto)
  recurrence?: TaskRecurrenceDto;
}
