export class ProjectResponseDto {
  id!: string;
  organizationId!: string;
  name!: string;
  description?: string;
  iconUrl?: string | null;
  visibility!: string;
  isArchived!: boolean;
  createdBy!: string;
  createdAt!: string;
  updatedAt!: string;
}
