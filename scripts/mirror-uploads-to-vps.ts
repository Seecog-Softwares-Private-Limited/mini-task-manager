/**
 * Push local uploads/attachments/* files to PUBLIC_API_URL via mirror-blob.
 * Use when localhost web uploaded files that mobile (VPS) cannot preview.
 *
 *   npx ts-node -r tsconfig-paths/register scripts/mirror-uploads-to-vps.ts
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.join(process.cwd(), '.env') });

const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
const SECRET =
  process.env.UPLOADS_MIRROR_SECRET?.trim() ||
  (process.env.JWT_SECRET ? `mirror:${process.env.JWT_SECRET}` : '');
const UPLOADS = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');

async function walk(dir: string, base = dir): Promise<string[]> {
  const out: string[] = [];
  let entries: Awaited<ReturnType<typeof fs.readdir>>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(full, base)));
    } else if (e.isFile()) {
      out.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  }
  return out;
}

async function main() {
  if (!PUBLIC_API_URL || !SECRET) {
    console.error('Need PUBLIC_API_URL and JWT_SECRET (or UPLOADS_MIRROR_SECRET) in .env');
    process.exit(1);
  }
  const root = path.join(UPLOADS, 'attachments');
  const files = await walk(root, UPLOADS);
  const keys = files.filter((f) => f.startsWith('attachments/'));
  console.log(`Mirroring ${keys.length} file(s) to ${PUBLIC_API_URL} …`);
  let ok = 0;
  let fail = 0;
  for (const storageKey of keys) {
    const buf = await fs.readFile(path.join(UPLOADS, storageKey));
    try {
      const res = await fetch(`${PUBLIC_API_URL}/api/v1/attachments/mirror-blob`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Uploads-Mirror-Secret': SECRET,
        },
        body: JSON.stringify({
          storageKey,
          contentBase64: buf.toString('base64'),
        }),
      });
      if (!res.ok) {
        fail += 1;
        console.warn(`FAIL ${storageKey}: ${res.status} ${await res.text()}`);
      } else {
        ok += 1;
        console.log(`OK   ${storageKey}`);
      }
    } catch (err) {
      fail += 1;
      console.warn(`FAIL ${storageKey}:`, err);
    }
  }
  console.log(`Done. ok=${ok} fail=${fail}`);
}

main();
