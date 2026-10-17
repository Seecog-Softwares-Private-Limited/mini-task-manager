import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;

  /**
   * Clients require ≥1 project unless the user opts into “Invite without project”.
   * Empty / omitted = workspace-only; invitee sees no projects until access is granted.
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  projectIds?: string[];
}
