import { IsArray, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

const emptyStrToNull = ({ value }: { value: unknown }) =>
  value === '' ? null : value;

export class UpdateTaskAssigneeDto {
  @IsOptional()
  @Transform(emptyStrToNull)
  @ValidateIf((_o, v) => v != null)
  @IsUUID('4')
  assigneeId?: string | null;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeIds?: string[];
}
