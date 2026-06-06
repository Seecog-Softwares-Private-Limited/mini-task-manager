import {
  IsArray,
  IsBoolean,
  IsString,
  IsIn,
  IsInt,
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
  @Transform(patchSubtaskDueDate)
  @ValidateIf((_o, v) => v != null && v !== '')
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'subtask dueDate must be YYYY-MM-DD' })
  dueDate?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: string;

  @IsOptional()
  @Transform(emptyStrToUndef)
  @ValidateIf((_o, v) => v != null && v !== '')
  @IsUUID('4')
  statusId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
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

  /** Clear with null; accept YYYY-MM-DD or ISO datetime from clients. */
  @IsOptional()
  @Transform(patchTaskDueDate)
  @ValidateIf((_o, v) => v !== null && v !== undefined && v !== '')
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dueDate must be YYYY-MM-DD' })
  dueDate?: string | null;

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
}
