import { IsString, Matches, Length, MinLength, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @MinLength(10, { message: 'Phone number must be at least 10 digits' })
  @MaxLength(20)
  @Matches(/^[+]?[\d\s-]+$/, { message: 'Invalid phone number format' })
  phone!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  code!: string;
}
