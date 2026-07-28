import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class MoveSubtaskDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  targetTaskId!: string;
}
