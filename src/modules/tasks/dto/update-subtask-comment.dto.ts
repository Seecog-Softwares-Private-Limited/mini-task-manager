import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSubtaskCommentDto {
  @IsString()
  @MinLength(1, { message: 'Comment cannot be empty' })
  @MaxLength(2000)
  body!: string;
}
