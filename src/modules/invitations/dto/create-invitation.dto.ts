import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;
}
