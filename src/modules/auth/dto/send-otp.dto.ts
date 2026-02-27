import { IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @MinLength(10, { message: 'Phone number must be at least 10 digits' })
  @MaxLength(20)
  @Matches(/^[+]?[\d\s-]+$/, { message: 'Invalid phone number format' })
  phone!: string;
}
