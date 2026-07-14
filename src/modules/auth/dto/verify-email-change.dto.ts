import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailChangeDto {
  /** 6-digit code emailed to the new address, or the full verification token. */
  @IsString()
  @IsNotEmpty()
  token!: string;
}
