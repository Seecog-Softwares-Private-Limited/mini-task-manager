import type { IndustryWords } from '../industry-packs';

export class OrganizationResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  ownerId!: string;
  logoUrl?: string | null;
  /** Current user's role in this organization (only in list response). */
  myRole?: string;
  isArchived?: boolean;
  /** IndustryKey, or null for a workspace created before industries existed. */
  industry?: string | null;
  /** Resolved terminology for `industry` (falls back to the General edition). */
  words!: IndustryWords;
}
