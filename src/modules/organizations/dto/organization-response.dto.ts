export class OrganizationResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  ownerId!: string;
  logoUrl?: string | null;
  /** Current user's role in this organization (only in list response). */
  myRole?: string;
  isArchived?: boolean;
}
