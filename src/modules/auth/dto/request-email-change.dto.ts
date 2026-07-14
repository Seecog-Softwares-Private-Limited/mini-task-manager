import { IsEmail } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  newEmail!: string;
}
