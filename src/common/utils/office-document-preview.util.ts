import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import WordExtractor from 'word-extractor';

export interface OfficePreviewResult {
  format: 'html';
  content: string;
}

function resolveFileExt(
  fileName?: string | null,
  fileExtension?: string | null,
  storedFileName?: string | null,
): string {
  const fromName = fileName?.split('.').pop()?.toLowerCase() ?? '';
  if (fromName && fromName !== fileName?.toLowerCase()) return fromName;

  const normalizedExt = fileExtension?.replace(/^\./, '').toLowerCase() ?? '';
  if (normalizedExt) return normalizedExt;

  return storedFileName?.split('.').pop()?.toLowerCase() ?? '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapPreformattedText(text: string): string {
  const escaped = escapeHtml(text);
  return `<pre class="whitespace-pre-wrap font-sans text-sm leading-relaxed">${escaped}</pre>`;
}

function isOleCompoundFile(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.readUInt16BE(0) === 0xd0cf;
}

function isZipOfficeFile(buffer: Buffer): boolean {
  if (buffer.length < 4 || buffer.readUInt16BE(0) !== 0x504b) return false;
  const next = buffer.readUInt16BE(2);
  return next === 0x0304 || next === 0x0506 || next === 0x0708;
}

function isHtmlBuffer(buffer: Buffer): boolean {
  const start = buffer.slice(0, 256).toString('utf-8').trim().toLowerCase();
  return start.startsWith('<!doctype html') || start.startsWith('<html');
}

async function extractLegacyDocText(buffer: Buffer): Promise<string | null> {
  const readDocumentText = async (source: string | Buffer): Promise<string | null> => {
    const extractor = new WordExtractor();
    const document = await extractor.extract(source);
    const parts = [
      document.getBody(),
      document.getHeaders(),
      document.getFooters(),
      document.getAnnotations(),
    ].filter((part) => part?.trim());
    const text = parts.join('\n\n').trim();
    return text || null;
  };

  try {
    return await readDocumentText(buffer);
  } catch {
    const tmpPath = path.join(os.tmpdir(), `doc-preview-${Date.now()}-${Math.random().toString(36).slice(2)}.doc`);
    try {
      await fs.writeFile(tmpPath, buffer);
      return await readDocumentText(tmpPath);
    } catch {
      return null;
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }
  }
}

async function extractDocxHtml(buffer: Buffer): Promise<string | null> {
  try {
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value.trim();
    return html || null;
  } catch {
    return null;
  }
}

async function extractSpreadsheetHtml(buffer: Buffer): Promise<string | null> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return null;
    const html = XLSX.utils.sheet_to_html(workbook.Sheets[sheetName], {
      id: 'attachment-preview-sheet',
      editable: false,
    });
    return html.trim() || null;
  } catch {
    return null;
  }
}

function extractCsvHtml(buffer: Buffer): string | null {
  try {
    const text = buffer.toString('utf-8');
    const rows = text.split(/\r?\n/).filter((line) => line.length > 0);
    if (!rows.length) return null;
    const tableRows = rows
      .map((line) => {
        const cells = line
          .split(',')
          .map((cell) => `<td>${escapeHtml(cell.trim())}</td>`)
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');
    return `<table class="w-full border-collapse text-sm"><tbody>${tableRows}</tbody></table>`;
  } catch {
    return null;
  }
}

export function isOfficeDocumentPreviewable(
  mimeType?: string | null,
  fileName?: string | null,
  fileExtension?: string | null,
  storedFileName?: string | null,
): boolean {
  const ext = resolveFileExt(fileName, fileExtension, storedFileName);
  const mime = mimeType ?? '';

  if (['doc', 'docx', 'xlsx', 'xls', 'xlsm', 'ods', 'csv'].includes(ext)) return true;

  if (mime.includes('wordprocessingml') || mime === 'application/msword') return true;
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime === 'application/vnd.oasis.opendocument.spreadsheet' ||
    mime === 'application/vnd.ms-excel.sheet.macroenabled.12'
  ) {
    return true;
  }
  return mime === 'text/csv';
}

export async function renderOfficeDocumentPreview(
  buffer: Buffer,
  fileName: string | null,
  mimeType: string | null,
  fileExtension?: string | null,
  storedFileName?: string | null,
): Promise<OfficePreviewResult | null> {
  try {
    if (!buffer.length) return null;
    if (isHtmlBuffer(buffer)) return null;

    const ext = resolveFileExt(fileName, fileExtension, storedFileName);
    const mime = mimeType ?? '';

    if (isOleCompoundFile(buffer)) {
      const text = await extractLegacyDocText(buffer);
      if (text) return { format: 'html', content: wrapPreformattedText(text) };
    }

    if (isZipOfficeFile(buffer)) {
      const docxHtml = await extractDocxHtml(buffer);
      if (docxHtml) return { format: 'html', content: docxHtml };

      const sheetHtml = await extractSpreadsheetHtml(buffer);
      if (sheetHtml) return { format: 'html', content: sheetHtml };
    }

    if (ext === 'doc' || (mime === 'application/msword' && ext !== 'docx')) {
      const text = await extractLegacyDocText(buffer);
      if (text) return { format: 'html', content: wrapPreformattedText(text) };
    }

    if (ext === 'docx' || mime.includes('wordprocessingml')) {
      const html = await extractDocxHtml(buffer);
      if (html) return { format: 'html', content: html };
    }

    if (
      ['xlsx', 'xls', 'xlsm', 'ods'].includes(ext) ||
      mime.includes('spreadsheet') ||
      mime.includes('excel') ||
      mime === 'application/vnd.oasis.opendocument.spreadsheet' ||
      mime === 'application/vnd.ms-excel.sheet.macroenabled.12'
    ) {
      const html = await extractSpreadsheetHtml(buffer);
      if (html) return { format: 'html', content: html };
    }

    if (ext === 'csv' || mime === 'text/csv') {
      const html = extractCsvHtml(buffer);
      if (html) return { format: 'html', content: html };
    }

    return null;
  } catch {
    return null;
  }
}
