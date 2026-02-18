export interface InviteEmailPayload {
    to: string;
    organizationName: string;
    inviterName: string;
    role: string;
    acceptUrl: string;
}
export declare class EmailService {
    private readonly logger;
    private transporter;
    constructor();
    sendInvitation(payload: InviteEmailPayload): Promise<void>;
}
