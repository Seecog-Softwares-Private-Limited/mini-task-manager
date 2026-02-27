export interface InviteEmailPayload {
    to: string;
    organizationName: string;
    inviterName: string;
    role: string;
    acceptUrl: string;
}
export interface TaskAssignmentEmailPayload {
    to: string;
    assigneeName: string;
    taskTitle: string;
    projectName?: string;
    assignerName: string;
    taskUrl: string;
}
export interface VerificationEmailPayload {
    to: string;
    fullName: string;
    verifyUrl: string;
}
export interface PasswordResetEmailPayload {
    to: string;
    fullName: string;
    resetUrl: string;
}
export declare class EmailService {
    private readonly logger;
    private transporter;
    constructor();
    sendInvitation(payload: InviteEmailPayload): Promise<void>;
    sendTaskAssignment(payload: TaskAssignmentEmailPayload): Promise<void>;
    sendVerificationEmail(payload: VerificationEmailPayload): Promise<void>;
    sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void>;
}
