import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const normalizeYmd = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  return value;
};

export const RECURRENCE_REPEAT_TYPES = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM'] as const;
export const RECURRENCE_END_TYPES = ['NEVER', 'ON_DATE', 'AFTER_OCCURRENCES'] as const;
export const RECURRENCE_MONTHLY_MODES = ['DAY_OF_MONTH', 'LAST_DAY', 'NTH_WEEKDAY'] as const;
export const RECURRENCE_CUSTOM_UNITS = ['DAY', 'WEEK', 'MONTH', 'YEAR'] as const;
export const RECURRENCE_DUE_LOGICS = ['DUE_DATE', 'DUE_TIME'] as const;

export type RecurrenceRepeatType = (typeof RECURRENCE_REPEAT_TYPES)[number];
export type RecurrenceEndType = (typeof RECURRENCE_END_TYPES)[number];
export type RecurrenceMonthlyMode = (typeof RECURRENCE_MONTHLY_MODES)[number];
export type RecurrenceCustomUnit = (typeof RECURRENCE_CUSTOM_UNITS)[number];
export type RecurrenceDueLogic = (typeof RECURRENCE_DUE_LOGICS)[number];

export class TaskRecurrenceDto {
  @IsOptional()
  @IsIn(RECURRENCE_REPEAT_TYPES)
  repeat?: RecurrenceRepeatType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  interval?: number;

  /** 0=Sun ... 6=Sat */
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weeklyDays?: number[];

  @IsOptional()
  @IsIn(RECURRENCE_MONTHLY_MODES)
  monthlyMode?: RecurrenceMonthlyMode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  /** 1,2,3,4,-1 (last) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-1)
  @Max(4)
  nthWeek?: number;

  /** 0=Sun ... 6=Sat */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  monthOfYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfYearMonth?: number;

  @IsOptional()
  @IsIn(RECURRENCE_CUSTOM_UNITS)
  customUnit?: RecurrenceCustomUnit;

  @IsOptional()
  @IsIn(RECURRENCE_END_TYPES)
  endType?: RecurrenceEndType;

  @IsOptional()
  @Transform(normalizeYmd)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  endAfterOccurrences?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  createDaysBeforeDue?: number;

  @IsOptional()
  @IsIn(RECURRENCE_DUE_LOGICS)
  dueLogic?: RecurrenceDueLogic;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'dueTime must be HH:mm',
  })
  dueTime?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  skipWeekends?: boolean;

  @IsOptional()
  @IsIn(['ALL_CHECKLIST', 'MANUAL'])
  completionRule?: 'ALL_CHECKLIST' | 'MANUAL';
}

