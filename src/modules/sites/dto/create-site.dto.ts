import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  address?: string;
}
