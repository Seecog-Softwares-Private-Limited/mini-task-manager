export class LoginResponseDto {
  accessToken!: string;
  user!: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
    isPlatformAdmin?: boolean;
  };
  organizationId?: string;
}
