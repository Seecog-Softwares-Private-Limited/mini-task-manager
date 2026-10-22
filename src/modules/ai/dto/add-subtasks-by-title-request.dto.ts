import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class AddSubtaskByTitleItemDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
}

export class AddSubtasksByTitleRequestDto {
  /** Task title to find. Exact match, case-insensitive. */
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  /** Narrows the search to one project when the title isn't unique across the organization. */
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AddSubtaskByTitleItemDto)
  subtasks!: AddSubtaskByTitleItemDto[];
}
