export declare class LoginResponseDto {
    accessToken: string;
    user: {
        id: string;
        email: string;
        fullName: string;
    };
    organizationId?: string;
}
