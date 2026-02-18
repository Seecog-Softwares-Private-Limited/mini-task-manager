import { IsString, IsNotEmpty } from 'class-validator';

export class AddProjectMemberDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;
}
