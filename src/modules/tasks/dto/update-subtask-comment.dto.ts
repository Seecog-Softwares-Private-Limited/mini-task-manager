import { IsString, MaxLength } from 'class-validator';

export class UpdateSubtaskCommentDto {
  @IsString()
  @MaxLength(2000)
  body!: string;
}
