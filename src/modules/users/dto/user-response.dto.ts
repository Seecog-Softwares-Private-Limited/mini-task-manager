export class UserResponseDto {
  id!: string;
  fullName!: string;
  email!: string;
  avatarUrl?: string;
  isEmailVerified!: boolean;
  isActive!: boolean;
  isPlatformAdmin!: boolean;
}
