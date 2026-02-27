export class InvoiceResponseDto {
  id!: string;
  subscriptionId!: string;
  amount!: number;
  currency!: string;
  status!: string;
  billingCycle!: string;
  planName!: string;
  userCount!: number;
  issuedAt!: Date;
  dueDate?: Date;
  paidAt?: Date;
}
