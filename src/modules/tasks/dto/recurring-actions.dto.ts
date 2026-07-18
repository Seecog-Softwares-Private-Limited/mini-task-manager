import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Min, Max, ValidateNested } from 'class-validator';
import { TaskRecurrenceDto } from './recurrence.dto';

export class CompleteRecurringTaskDto {
  @IsIn(['ONLY_THIS', 'THIS_AND_PREVIOUS_PENDING', 'STOP_SERIES_PERMANENTLY'])
  action!: 'ONLY_THIS' | 'THIS_AND_PREVIOUS_PENDING' | 'STOP_SERIES_PERMANENTLY';

  @IsOptional()
  @IsUUID('4')
  doneStatusId?: string;
}

export class RecurringTasksQueryDto {
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @IsOptional()
  @IsIn(['UPCOMING', 'OVERDUE', 'TEMPLATES', 'COMPLETED_HISTORY'])
  tab?: 'UPCOMING' | 'OVERDUE' | 'TEMPLATES' | 'COMPLETED_HISTORY';
}

export class SkipNextOccurrenceDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  steps?: number;
}

export class UpdateRecurringTemplateDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TaskRecurrenceDto)
  recurrence?: TaskRecurrenceDto;
}

