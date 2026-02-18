export class InvoiceResponseDto {
  id!: string;
  subscriptionId!: string;
  amount!: string;
  status!: string;
  issuedAt!: Date;
  paidAt?: Date;
}
