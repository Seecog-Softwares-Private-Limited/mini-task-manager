import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

export function resolveStoredUploadPath(uploadsPath: string, storedPath: string): string {
  let relative = storedPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (relative.startsWith('uploads/')) {
    relative = relative.slice('uploads/'.length);
  }
  return path.join(uploadsPath, relative);
}

/** Try common upload directory layouts (PM2 cwd / UPLOADS_PATH mismatches). */
export function candidateUploadPaths(uploadsPath: string, storedPath: string): string[] {
  const normalized = storedPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const relative = normalized.startsWith('uploads/')
    ? normalized.slice('uploads/'.length)
    : normalized;

  const candidates = new Set<string>([
    resolveStoredUploadPath(uploadsPath, normalized),
    path.join(process.cwd(), 'uploads', relative),
    path.join(process.cwd(), normalized),
  ]);

  if (path.isAbsolute(normalized)) {
    candidates.add(normalized);
  }

  return [...candidates];
}

export async function findExistingUploadPath(
  uploadsPath: string,
  storedPath: string,
): Promise<string> {
  for (const candidate of candidateUploadPaths(uploadsPath, storedPath)) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* try next candidate */
    }
  }

  throw new NotFoundException(
    'Attachment file is missing on the server. Re-upload the file.',
  );
}
