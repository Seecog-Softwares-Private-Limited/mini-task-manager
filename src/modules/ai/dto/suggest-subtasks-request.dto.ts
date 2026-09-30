import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SuggestSubtasksDraftItemDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;
}

export class SuggestSubtasksDraftDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  /** Matches the existing checklist-item description limit. */
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SuggestSubtasksDraftItemDto)
  subtasks?: SuggestSubtasksDraftItemDto[];
}

@ValidatorConstraint({ name: 'exactlyOneSuggestionSource', async: false })
export class ExactlyOneSuggestionSourceConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value !== undefined) return false;
    const obj = args.object as SuggestSubtasksRequestDto;
    const hasTask = typeof obj.taskId === 'string' && obj.taskId.length > 0;
    const hasDraft = obj.draft != null;
    return hasTask !== hasDraft;
  }

  defaultMessage(): string {
    return 'Provide exactly one of taskId or draft';
  }
}

export class SuggestSubtasksRequestDto {
  @IsOptional()
  @IsUUID('4')
  taskId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SuggestSubtasksDraftDto)
  draft?: SuggestSubtasksDraftDto;

  /** Titles shown on the previous Suggest click. Not saved. Used only to ask for a different set. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  excludeTitles?: string[];

  @Validate(ExactlyOneSuggestionSourceConstraint)
  sourceCheck?: undefined;
}
