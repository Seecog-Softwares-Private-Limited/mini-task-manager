import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name cannot be empty' })
  @MaxLength(120, { message: 'Name must be at most 120 characters' })
  fullName?: string;
}
