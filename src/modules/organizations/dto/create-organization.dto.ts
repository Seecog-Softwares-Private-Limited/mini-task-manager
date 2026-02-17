import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsString()
  @MaxLength(150)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric and hyphens only' })
  slug!: string;
}
