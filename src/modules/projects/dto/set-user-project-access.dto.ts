import { IsArray, IsString } from 'class-validator';

export class SetUserProjectAccessDto {
  @IsArray()
  @IsString({ each: true })
  projectIds!: string[];
}
