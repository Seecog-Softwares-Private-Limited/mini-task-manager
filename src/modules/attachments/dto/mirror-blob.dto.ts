import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class MirrorBlobDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  storageKey!: string;

  /** Base64-encoded file bytes (max ~10MB original → ~14MB encoded). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(20_000_000)
  contentBase64!: string;
}
