export class SiteResponseDto {
  id!: string;
  organizationId!: string;
  name!: string;
  address?: string | null;
  isArchived!: boolean;
  createdBy!: string;
  createdAt!: string;
  updatedAt!: string;
}
