import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class CreateSubtaskCommentDto {
  /** Text may be empty for attachment-only notes. */
  @Transform(({ value }) => (typeof value === 'string' ? value : value == null ? '' : String(value)))
  @IsString()
  @MaxLength(2000)
  body: string = '';

  /** Root notes omit this. Replies set parentId to any note in the same thread. */
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID('4')
  parentId?: string | null;
}
