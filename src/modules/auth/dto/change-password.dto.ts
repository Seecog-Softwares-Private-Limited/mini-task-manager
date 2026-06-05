import { IsOptional, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  newPassword!: string;
}
