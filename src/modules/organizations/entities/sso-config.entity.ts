import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { uuidBinaryTransformer } from '../../../common/base.entity';
import { OrganizationEntity } from './organization.entity';

/**
 * SSO configuration for an organization.
 * Only one active SSO config per organization at a time.
 * Gated by plan features — only plans with { sso: true } can create/enable SSO.
 */
@Entity('sso_configs')
@Index('idx_sso_configs_organization_id', ['organizationId'], { unique: true })
export class SSOConfigEntity {
  @PrimaryColumn({ type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  id!: string;

  @Column({ name: 'organization_id', type: 'binary', length: 16, transformer: uuidBinaryTransformer })
  organizationId!: string;

  /** 'SAML' | 'OIDC' */
  @Column({ type: 'varchar', length: 20 })
  provider!: string;

  /** Friendly label, e.g. "Okta", "Azure AD", "Google Workspace" */
  @Column({ type: 'varchar', length: 150, nullable: true })
  label!: string | null;

  /** SAML: IdP Entity ID / OIDC: Issuer URL */
  @Column({ name: 'issuer_url', type: 'text', nullable: true })
  issuerUrl!: string | null;

  /** SAML: SSO URL / OIDC: Authorization URL */
  @Column({ name: 'sso_url', type: 'text', nullable: true })
  ssoUrl!: string | null;

  /** OIDC: Client ID */
  @Column({ name: 'client_id', type: 'varchar', length: 255, nullable: true })
  clientId!: string | null;

  /** OIDC: Client Secret (encrypted at-rest in production) */
  @Column({ name: 'client_secret', type: 'varchar', length: 512, nullable: true })
  clientSecret!: string | null;

  /** SAML: Base64-encoded X.509 certificate */
  @Column({ type: 'text', nullable: true })
  certificate!: string | null;

  /** OIDC: Metadata / discovery URL */
  @Column({ name: 'metadata_url', type: 'text', nullable: true })
  metadataUrl!: string | null;

  /** Domain(s) that auto-route to this SSO config (comma-separated) */
  @Column({ type: 'varchar', length: 500, nullable: true })
  domains!: string | null;

  @Column({ name: 'is_enabled', type: 'boolean', default: false })
  isEnabled!: boolean;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;
}
