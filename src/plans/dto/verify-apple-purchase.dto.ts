import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyApplePurchaseDto {
  /** StoreKit transaction / purchase identifier. */
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  transactionId!: string;

  /** Optional JWS signed transaction (StoreKit 2). Improves offline verification. */
  @IsOptional()
  @IsString()
  @MaxLength(16_000)
  signedTransaction?: string;

  /** Product id from the store (cross-checked against Apple response). */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  productId?: string;
}
