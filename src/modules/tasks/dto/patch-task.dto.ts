import {
  Allow,
  IsArray,
  IsBoolean,
  IsString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ValidateIf,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TaskRecurrenceDto } from './recurrence.dto';

/** Avoid IsUUID / IsDateString failures on "" from clients; omit after transform. */
const emptyStrToUndef = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;
const emptyStrToNull = ({ value }: { value: unknown }) =>
  value === '' ? null : value;

/** Task-level dueDate: clear with null; normalize ISO → YYYY-MM-DD. */
const patchTaskDueDate = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) {
    return value === '' ? null : value;
  }
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  return value;
};

/** Subtask dueDate: empty → undefined; normalize ISO → YYYY-MM-DD. */
const patchSubtaskDueDate = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  return value;
};

class PatchTaskSubtaskDto {
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
  @Transform(emptyStrToUndef)
  @ValidateIf((_o, v) => v != null && v !== '')
  @IsUUID('4')
  assigneeId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeIds?: string[];

  @IsOptional()
  @Transform(patchSubtaskDueDate)
  @ValidateIf((_o, v) => v != null && v !== '')
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'subtask dueDate must be YYYY-MM-DD' })
  dueDate?: string;

  /** Optional time of day (HH:mm). Cleared when dueDate is cleared. */
  @IsOptional()
  @Transform(emptyStrToUndef)
  @ValidateIf((_o, v) => v != null && v !== '')
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'dueTime must be HH:mm' })
  dueTime?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['TODO', 'IN_PROGRESS', 'DONE'])
  status?: string;

  @IsOptional()
  @Transform(emptyStrToUndef)
  @ValidateIf((_o, v) => v != null && v !== '')
  @IsUUID('4')
  statusId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  /** Audit fields preserved server-side; accepted so clients may echo them back. */
  @IsOptional()
  @Transform(emptyStrToUndef)
  @ValidateIf((_o, v) => v != null && v !== '')
  @IsString()
  @MaxLength(100)
  reporterId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  createdAt?: string;

  @IsOptional()
  @IsObject()
  completionRecord?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

class PatchTaskTagDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsString()
  @MaxLength(20)
  color!: string;
}

export class PatchTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(emptyStrToNull)
  @ValidateIf((_o, v) => v != null)
  @IsUUID('4', { message: 'statusId must be a valid UUID' })
  statusId?: string | null;

  @IsOptional()
  @Transform(emptyStrToNull)
  @ValidateIf((_o, v) => v != null)
  @IsUUID('4', { message: 'sprintId must be a valid UUID' })
  sprintId?: string | null;

  @IsOptional()
  @Transform(emptyStrToNull)
  @ValidateIf((_o, v) => v != null)
  @IsUUID('4', { message: 'assigneeId must be a valid UUID' })
  assigneeId?: string | null;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeIds?: string[];

  /** Clear with null; accept YYYY-MM-DD or ISO datetime from clients. */
  @IsOptional()
  @Transform(patchTaskDueDate)
  @ValidateIf((_o, v) => v !== null && v !== undefined && v !== '')
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dueDate must be YYYY-MM-DD' })
  dueDate?: string | null;

  /** Optional HH:mm. Cleared when dueDate is cleared. Send null to clear. */
  @Allow()
  @IsOptional()
  @Transform(emptyStrToNull)
  @ValidateIf((_o, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'dueTime must be HH:mm' })
  dueTime?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v != null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  storyPoints?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatchTaskTagDto)
  tags?: PatchTaskTagDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatchTaskSubtaskDto)
  subtasks?: PatchTaskSubtaskDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TaskRecurrenceDto)
  recurrence?: TaskRecurrenceDto;
}
