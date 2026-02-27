import { IsEmail, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class PublicSignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
