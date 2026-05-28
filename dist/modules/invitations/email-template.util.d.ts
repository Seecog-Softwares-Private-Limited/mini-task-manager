export declare function escapeHtml(text: string): string;
export declare function isLocalhostUrl(url: string): boolean;
export declare function emailLocalLinkBlock(actionUrl: string, actionLabel: string): string;
export declare function emailLinkFallback(actionUrl: string): string;
export declare function emailActionSection(actionUrl: string, label: string): string;
export declare function emailPlainTextWithLink(intro: string, actionUrl: string, shortCode?: string): string;
export declare function emailInvitationBody(params: {
    inviterName: string;
    organizationName: string;
    role: string;
    acceptUrl: string;
}): string;
export declare function emailVerificationBody(params: {
    fullName: string;
    verifyUrl: string;
    verifyPageUrl: string;
    shortCode: string;
}): string;
export declare function emailPasswordResetBody(params: {
    fullName: string;
    resetUrl: string;
}): string;
export declare function emailVerificationCodeBlock(shortCode: string, verifyPageUrl: string): string;
export declare function emailVerificationActions(verifyUrl: string): string;
export declare function emailLayout(bodyHtml: string): string;
