import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Configuration } from '../../config/configuration';
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
    verifyPageUrl: string;
    shortCode: string;
}
export interface PasswordResetEmailPayload {
    to: string;
    fullName: string;
    resetUrl: string;
}
export declare class EmailService implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private transporter;
    private smtp;
    private readonly nodeEnv;
    constructor(configService: ConfigService<Configuration>);
    onModuleInit(): Promise<void>;
    sendInvitation(payload: InviteEmailPayload): Promise<void>;
    sendTaskAssignment(payload: TaskAssignmentEmailPayload): Promise<void>;
    sendVerificationEmail(payload: VerificationEmailPayload): Promise<void>;
    sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void>;
    private initTransport;
    private formatFromAddress;
    private deliver;
    private userFacingEmailError;
    private formatError;
}
