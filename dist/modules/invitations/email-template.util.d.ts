export declare function escapeHtml(text: string): string;
export declare function isLocalhostUrl(url: string): boolean;
export declare function emailActionButton(actionUrl: string, label: string): string;
export declare function emailLinkFallback(actionUrl: string): string;
export declare function emailPlainTextWithLink(intro: string, actionUrl: string, shortCode?: string): string;
export declare function emailVerificationCodeBlock(shortCode: string, verifyPageUrl: string): string;
export declare function emailActionSection(actionUrl: string, label: string): string;
export declare function emailVerificationActions(verifyUrl: string): string;
export declare function emailLayout(bodyHtml: string): string;
