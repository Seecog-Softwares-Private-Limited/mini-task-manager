import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateCustomFieldDto {
  @IsString()
  projectId!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(50)
  fieldType!: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
