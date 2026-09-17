export class LoginResponseDto {
  accessToken!: string;
  user!: {
    id: string;
    email: string;
    fullName: string;
    phone?: string | null;
    avatarUrl?: string | null;
    isPlatformAdmin?: boolean;
  };
  organizationId?: string;
}
