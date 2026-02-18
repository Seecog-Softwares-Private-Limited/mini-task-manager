import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateProjectMemberRoleDto {
  @IsString()
  @IsNotEmpty()
  role!: string;
}
