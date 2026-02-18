import { InvoiceEntity } from './invoice.entity';
export declare class PaymentEntity {
    id: string;
    invoiceId: string;
    paymentGateway: string | null;
    transactionId: string | null;
    status: string | null;
    paidAt: Date | null;
    invoice?: InvoiceEntity;
}
