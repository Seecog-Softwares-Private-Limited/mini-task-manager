export class UserResponseDto {
  id!: string;
  fullName!: string;
  email!: string;
  phone?: string | null;
  avatarUrl?: string;
  isEmailVerified!: boolean;
  isActive!: boolean;
  isPlatformAdmin!: boolean;
}
