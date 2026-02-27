export declare class SmsService {
    private readonly logger;
    private client;
    private fromNumber;
    constructor();
    sendOtp(to: string, code: string): Promise<boolean>;
    normalizePhone(phone: string): string | null;
}
