import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Configuration } from '../../config/configuration';
import { generateUuid } from '../../common/utils/uuid.util';
import { findExistingUploadPath } from '../../common/utils/upload-path.util';
import { resolveAttachmentDisplayName } from '../../common/utils/attachment-display-name.util';
import { TasksRepository } from '../tasks/repositories/tasks.repository';
import { SubtaskCommentsRepository } from '../tasks/repositories/subtask-comments.repository';
import { UsageService } from '../billing/usage.service';
import { PlanLimitService } from '../../plans/plan-limit.service';
import {
  isOfficeDocumentPreviewable,
  renderOfficeDocumentPreview,
  type OfficePreviewResult,
} from '../../common/utils/office-document-preview.util';
import { AttachmentEntity, AttachmentEntityType } from './entities/attachment.entity';
import { AttachmentsRepository } from './repositories/attachments.repository';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'file';
}

function normalizeMime(mimetype: string): string {
  return mimetype.split(';')[0]?.trim().toLowerCase() || '';
}

function isAllowedMime(mimetype: string, fileName?: string | null): boolean {
  const mime = normalizeMime(mimetype);
  if (mime) {
    const allowed = [
      'image/',
      'audio/',
      'video/',
      'text/',
      'application/pdf',
      'application/json',
      'application/zip',
      'application/x-zip-compressed',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroenabled.12',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
    ];
    if (
      allowed.some((prefix) =>
        prefix.endsWith('/') ? mime.startsWith(prefix) : mime === prefix,
      )
    ) {
      return true;
    }
  }

  const ext = fileName?.split('.').pop()?.toLowerCase() ?? '';
  return [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'bmp',
    'svg',
    'pdf',
    'txt',
    'csv',
    'json',
    'md',
    'm4a',
    'mp3',
    'aac',
    'wav',
    'ogg',
    'webm',
    'mp4',
    'mov',
  ].includes(ext);
}

function isPreviewableMime(
  mimetype: string | null,
  fileName?: string | null,
): 'image' | 'pdf' | 'text' | 'none' {
  if (mimetype?.startsWith('image/')) return 'image';
  if (mimetype === 'application/pdf') return 'pdf';
  if (
    mimetype?.startsWith('text/') ||
    mimetype === 'application/json' ||
    mimetype === 'text/csv'
  ) {
    return 'text';
  }
  const ext = fileName?.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['txt', 'csv', 'json', 'md'].includes(ext)) return 'text';
  return 'none';
}

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly attachmentsRepository: AttachmentsRepository,
    private readonly tasksRepository: TasksRepository,
    private readonly subtaskCommentsRepository: SubtaskCommentsRepository,
    private readonly configService: ConfigService<Configuration>,
    private readonly usageService: UsageService,
    private readonly planLimitService: PlanLimitService,
  ) {}

  async findByEntity(
    entityType: AttachmentEntityType,
    entityId: string,
    organizationId: string,
    taskIdHint?: string,
  ): Promise<AttachmentEntity[]> {
    try {
      await this.assertEntityAccess(entityType, entityId, organizationId, taskIdHint);
    } catch (err) {
      // List should not 404 for series/template checklist ids (no board task yet).
      if (err instanceof NotFoundException && entityType === 'SUBTASK') {
        return [];
      }
      throw err;
    }
    return this.attachmentsRepository.findByEntityInWorkspace(
      entityType,
      entityId,
      organizationId,
    );
  }

  async upload(
    entityType: AttachmentEntityType,
    entityId: string,
    organizationId: string,
    userId: string,
    file: { originalname?: string; mimetype?: string; size: number; buffer: Buffer },
    taskIdHint?: string,
  ): Promise<AttachmentEntity> {
    if (!file) throw new BadRequestException('File is required');
    if (file.size > MAX_FILE_SIZE) throw new ForbiddenException('File too large (max 10MB)');
    if (!isAllowedMime(file.mimetype || '', file.originalname)) {
      throw new ForbiddenException(
        `File type not allowed (${file.mimetype || 'unknown'}${
          file.originalname ? `, ${file.originalname}` : ''
        })`,
      );
    }

    const context = await this.resolveEntityContext(
      entityType,
      entityId,
      organizationId,
      taskIdHint,
    );

    await this.planLimitService.assertStorageLimit(userId, file.size);

    const storageMbIncrement = Math.ceil(file.size / (1024 * 1024));
    const limitCheck = await this.usageService.checkLimit(
      organizationId,
      'storageGb',
      storageMbIncrement,
    );
    if (!limitCheck.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          error: 'LIMIT_EXCEEDED',
          code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
          resource: limitCheck.resource,
          current: limitCheck.current,
          limit: limitCheck.limit,
          message: limitCheck.message,
          upgradeUrl: '/dashboard/billing',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const dir = path.join(uploadsPath, 'attachments', entityType.toLowerCase(), entityId);
    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(file.originalname || '') || '';
    const base = sanitizeFileName(path.basename(file.originalname || 'file', ext));
    const storedFileName = `${generateUuid()}-${base}${ext}`;
    const storageKey = path
      .join('attachments', entityType.toLowerCase(), entityId, storedFileName)
      .replace(/\\/g, '/');
    const fullPath = path.join(uploadsPath, storageKey);
    await fs.writeFile(fullPath, file.buffer);

    const displayName = resolveAttachmentDisplayName(file.originalname, file.mimetype);
    const attachment = await this.attachmentsRepository.create({
      workspaceId: organizationId,
      projectId: context.projectId,
      taskId: context.taskId,
      entityType,
      entityId,
      originalFileName: displayName,
      storedFileName,
      mimeType: normalizeMime(file.mimetype || '') || file.mimetype || null,
      fileExtension: ext.replace(/^\./, '') || null,
      fileSize: file.size,
      storageProvider: 'local',
      storageKey,
      uploadedBy: userId,
      isDeleted: false,
    });

    await this.planLimitService.incrementStorageUsed(userId, file.size);
    // Await mirror so mobile/VPS can preview immediately after local/web upload.
    await this.mirrorUploadBytes(storageKey, file.buffer);
    return attachment;
  }

  /**
   * Accept a mirrored file blob from another Nest instance that shares this DB.
   * Writes only the file; the attachment row already exists.
   */
  async acceptMirroredUpload(
    secret: string | undefined,
    storageKey: string,
    contentBase64: string,
  ): Promise<{ ok: true }> {
    this.assertMirrorSecret(secret);
    const key = this.normalizeStorageKey(storageKey);
    let buffer: Buffer;
    try {
      buffer = Buffer.from(String(contentBase64 ?? ''), 'base64');
    } catch {
      throw new BadRequestException('Invalid file payload');
    }
    if (!buffer.length || buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('Invalid file size');
    }
    await this.writeStorageKey(key, buffer);
    return { ok: true };
  }

  /**
   * Server-to-server: return file bytes so another host can pull a missing upload.
   */
  async provideMirroredUpload(
    secret: string | undefined,
    storageKey: string,
  ): Promise<{ storageKey: string; contentBase64: string }> {
    this.assertMirrorSecret(secret);
    const key = this.normalizeStorageKey(storageKey);
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    let fullPath: string;
    try {
      fullPath = await findExistingUploadPath(uploadsPath, key);
    } catch {
      throw new NotFoundException('Attachment file is not on this host');
    }
    const buffer = await fs.readFile(fullPath);
    if (!buffer.length || buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('Invalid file size');
    }
    return { storageKey: key, contentBase64: buffer.toString('base64') };
  }

  private assertMirrorSecret(secret: string | undefined): void {
    const expected = this.configService.get('uploadsMirrorSecret', { infer: true }) ?? '';
    if (!expected || !secret || secret !== expected) {
      throw new ForbiddenException('Invalid mirror secret');
    }
  }

  private normalizeStorageKey(storageKey: string): string {
    const key = String(storageKey ?? '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');
    if (
      !key ||
      key.includes('..') ||
      (!key.startsWith('attachments/') && !key.startsWith('task-attachments/'))
    ) {
      throw new BadRequestException('Invalid storageKey');
    }
    return key;
  }

  private async writeStorageKey(storageKey: string, buffer: Buffer): Promise<string> {
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const fullPath = path.join(uploadsPath, storageKey);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    return fullPath;
  }

  private canonicalApiBase(): string | null {
    const publicApiUrl = (this.configService.get('publicApiUrl', { infer: true }) ?? '')
      .trim()
      .replace(/\/$/, '');
    if (!publicApiUrl) return null;
    try {
      const target = new URL(publicApiUrl);
      const isLoopback =
        target.hostname === 'localhost' ||
        target.hostname === '127.0.0.1' ||
        target.hostname === '0.0.0.0';
      if (isLoopback) return null;
      return publicApiUrl;
    } catch {
      return null;
    }
  }

  private isSelfCanonicalHost(publicApiUrl: string): boolean {
    // Production is the canonical store — never pull from itself.
    if (process.env.APP_MODE === 'production') return true;
    try {
      const target = new URL(publicApiUrl);
      const port = this.configService.get('port', { infer: true });
      const targetPort = String(
        target.port || (target.protocol === 'https:' ? 443 : 80),
      );
      return targetPort === String(port);
    } catch {
      return false;
    }
  }

  /**
   * Push bytes to the canonical (production) API so mobile/web on VPS can preview
   * files uploaded from local Nest while sharing the same DB.
   */
  private async mirrorUploadBytes(storageKey: string, buffer: Buffer): Promise<void> {
    if (process.env.APP_MODE === 'production') return;

    const publicApiUrl = this.canonicalApiBase();
    const secret = this.configService.get('uploadsMirrorSecret', { infer: true }) ?? '';
    if (!publicApiUrl || !secret) {
      this.logger.warn(
        `Upload mirror skipped for ${storageKey}: set PUBLIC_API_URL and UPLOADS_MIRROR_SECRET (or JWT_SECRET)`,
      );
      return;
    }

    const endpoint = `${publicApiUrl}/api/v1/attachments/mirror-blob`;
    let lastError = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Uploads-Mirror-Secret': secret,
          },
          body: JSON.stringify({
            storageKey,
            contentBase64: buffer.toString('base64'),
          }),
          signal: AbortSignal.timeout(30_000),
        });
        if (res.ok) {
          this.logger.log(`Upload mirrored to ${publicApiUrl} (${storageKey})`);
          return;
        }
        lastError = `${res.status} ${(await res.text().catch(() => '')).slice(0, 160)}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }
    this.logger.error(
      `Upload mirror FAILED for ${storageKey} after 3 attempts → ${publicApiUrl}: ${lastError}`,
    );
  }

  /**
   * If this host is missing the file, pull from the canonical production API.
   */
  private async pullFromCanonicalIfMissing(storageKey: string): Promise<string | null> {
    const publicApiUrl = this.canonicalApiBase();
    const secret = this.configService.get('uploadsMirrorSecret', { infer: true }) ?? '';
    if (!publicApiUrl || !secret) return null;
    if (this.isSelfCanonicalHost(publicApiUrl)) return null;

    const endpoint =
      `${publicApiUrl}/api/v1/attachments/mirror-fetch` +
      `?storageKey=${encodeURIComponent(storageKey)}`;
    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'X-Uploads-Mirror-Secret': secret },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        this.logger.warn(
          `Pull mirror miss for ${storageKey} from ${publicApiUrl}: ${res.status}`,
        );
        return null;
      }
      const body = (await res.json()) as { contentBase64?: string; storageKey?: string };
      if (!body?.contentBase64) return null;
      const buffer = Buffer.from(body.contentBase64, 'base64');
      if (!buffer.length) return null;
      const fullPath = await this.writeStorageKey(storageKey, buffer);
      this.logger.log(`Pulled missing attachment from ${publicApiUrl}: ${storageKey}`);
      return fullPath;
    } catch (err) {
      this.logger.warn(
        `Pull mirror error for ${storageKey}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  async getFileForDownload(
    attachmentId: string,
    organizationId: string,
  ): Promise<{ path: string; fileName: string | null; mimeType: string | null }> {
    const attachment = await this.getAttachmentOrThrow(attachmentId, organizationId);
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const fullPath = await this.assertAttachmentFileExists(uploadsPath, attachment.storageKey);
    return {
      path: fullPath,
      fileName: attachment.originalFileName,
      mimeType: attachment.mimeType,
    };
  }

  async getRenderedPreview(
    attachmentId: string,
    organizationId: string,
  ): Promise<OfficePreviewResult> {
    const attachment = await this.getAttachmentOrThrow(attachmentId, organizationId);
    if (
      !isOfficeDocumentPreviewable(
        attachment.mimeType,
        attachment.originalFileName,
        attachment.fileExtension,
        attachment.storedFileName,
      )
    ) {
      throw new BadRequestException('Preview is not available for this file type.');
    }
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const fullPath = await this.assertAttachmentFileExists(
      uploadsPath,
      attachment.storageKey,
    );
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(fullPath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') {
        throw new NotFoundException('Attachment file not found');
      }
      throw new BadRequestException('Could not read this document. Try downloading the file instead.');
    }
    const rendered = await renderOfficeDocumentPreview(
      buffer,
      attachment.originalFileName,
      attachment.mimeType,
      attachment.fileExtension,
      attachment.storedFileName,
    );
    if (!rendered) {
      throw new BadRequestException('Could not read this document. Try downloading the file instead.');
    }
    return rendered;
  }

  async getPreviewInfo(
    attachmentId: string,
    organizationId: string,
  ): Promise<
    | { kind: 'file'; path: string; fileName: string | null; mimeType: string | null }
    | { kind: 'unsupported'; fileName: string | null; mimeType: string | null }
  > {
    const attachment = await this.getAttachmentOrThrow(attachmentId, organizationId);
    const previewKind = isPreviewableMime(attachment.mimeType, attachment.originalFileName);
    if (previewKind === 'none') {
      return {
        kind: 'unsupported',
        fileName: attachment.originalFileName,
        mimeType: attachment.mimeType,
      };
    }
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    const fullPath = await this.assertAttachmentFileExists(uploadsPath, attachment.storageKey);
    return {
      kind: 'file',
      path: fullPath,
      fileName: attachment.originalFileName,
      mimeType: attachment.mimeType,
    };
  }

  async delete(attachmentId: string, organizationId: string, userId: string): Promise<void> {
    const attachment = await this.getAttachmentOrThrow(attachmentId, organizationId);
    const uploadsPath = this.configService.get('uploadsPath', { infer: true })!;
    try {
      const fullPath = await findExistingUploadPath(uploadsPath, attachment.storageKey);
      await fs.unlink(fullPath).catch(() => {});
    } catch {
      /* file already removed from disk */
    }
    await this.attachmentsRepository.softDelete(attachmentId);
    if (attachment.fileSize && attachment.uploadedBy) {
      await this.planLimitService.decrementStorageUsed(
        attachment.uploadedBy,
        Number(attachment.fileSize),
      );
    }
  }

  private async assertAttachmentFileExists(
    uploadsPath: string,
    storageKey: string,
  ): Promise<string> {
    try {
      return await findExistingUploadPath(uploadsPath, storageKey);
    } catch (err) {
      const pulled = await this.pullFromCanonicalIfMissing(storageKey);
      if (pulled) return pulled;
      throw err;
    }
  }

  private async getAttachmentOrThrow(
    attachmentId: string,
    organizationId: string,
  ): Promise<AttachmentEntity> {
    const attachment = await this.attachmentsRepository.findById(attachmentId);
    if (!attachment || attachment.workspaceId !== organizationId) {
      throw new NotFoundException('Attachment not found');
    }
    return attachment;
  }

  private async assertEntityAccess(
    entityType: AttachmentEntityType,
    entityId: string,
    organizationId: string,
    taskIdHint?: string,
  ): Promise<void> {
    await this.resolveEntityContext(entityType, entityId, organizationId, taskIdHint);
  }

  private async resolveEntityContext(
    entityType: AttachmentEntityType,
    entityId: string,
    organizationId: string,
    taskIdHint?: string,
  ): Promise<{ projectId: string; taskId: string | null }> {
    if (entityType === 'TASK') {
      const task = await this.tasksRepository.findByIdAndOrganization(entityId, organizationId);
      if (!task) throw new NotFoundException('Task not found');
      return { projectId: task.projectId, taskId: task.id };
    }

    if (entityType === 'SUBTASK') {
      // Prefer taskId hint: mobile client ids may not match JSON_SEARCH, and
      // checklist edits can drop a subtask while attachments remain. Org scope
      // comes from the task row (then attachments filtered by workspaceId).
      if (taskIdHint) {
        const hinted = await this.tasksRepository.findByIdAndOrganization(
          taskIdHint,
          organizationId,
        );
        if (hinted) {
          return { projectId: hinted.projectId, taskId: hinted.id };
        }
      }
      let task = await this.findTaskContainingSubtask(entityId, organizationId);
      if (!task) throw new NotFoundException('Subtask not found');
      return { projectId: task.projectId, taskId: task.id };
    }

    if (entityType === 'SUBTASK_COMMENT') {
      const comment = await this.subtaskCommentsRepository.findById(entityId);
      if (!comment || comment.organizationId !== organizationId) {
        throw new NotFoundException('Subtask note not found');
      }
      if (taskIdHint && comment.taskId !== taskIdHint) {
        throw new NotFoundException('Subtask note not found');
      }
      const task = await this.tasksRepository.findByIdAndOrganization(
        comment.taskId,
        organizationId,
      );
      if (!task) throw new NotFoundException('Task not found');
      return { projectId: task.projectId, taskId: task.id };
    }

    throw new BadRequestException('Invalid entity type');
  }

  private async findTaskContainingSubtask(
    subtaskId: string,
    organizationId: string,
  ) {
    return this.tasksRepository.findBySubtaskId(subtaskId, organizationId);
  }
}
