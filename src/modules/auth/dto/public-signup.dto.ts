import { IsEmail, IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class PublicSignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;
}
