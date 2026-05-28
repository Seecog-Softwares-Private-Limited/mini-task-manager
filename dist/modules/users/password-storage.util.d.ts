export declare function toStoredPassword(plainPassword: string): string;
export declare function verifyPasswordAgainstStored(plainPassword: string, stored: string | null): Promise<boolean>;
