import { IsString, MaxLength, MinLength, IsArray, IsOptional, IsUUID } from 'class-validator';

export class CreateTaskCommentDto {
  @IsString()
  @MinLength(1, { message: 'Comment cannot be empty' })
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mentionedUserIds?: string[];
}
