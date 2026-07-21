import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  token!: string;

  @IsString()
  @IsIn(['android', 'ios'])
  platform!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceId?: string;
}

export class DeleteDeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  token!: string;
}
