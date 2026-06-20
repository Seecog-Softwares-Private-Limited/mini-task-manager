import DOMPurify from "dompurify";

function fileExt(fileName?: string): string {
  return fileName?.split(".").pop()?.toLowerCase() ?? "";
}

export function isDocxPreviewable(mimeType?: string, fileName?: string): boolean {
  const ext = fileExt(fileName);
  if (ext === "docx") return true;
  return Boolean(mimeType?.includes("wordprocessingml"));
}

export function isLegacyDocMime(mimeType?: string, fileName?: string): boolean {
  const ext = fileExt(fileName);
  if (ext === "doc") return true;
  return mimeType === "application/msword" && ext !== "docx";
}

export function isSpreadsheetPreviewable(mimeType?: string, fileName?: string): boolean {
  const ext = fileExt(fileName);
  if (["xlsx", "xls", "xlsm", "ods"].includes(ext)) return true;
  return Boolean(
    mimeType?.includes("spreadsheet") ||
      mimeType?.includes("excel") ||
      mimeType === "application/vnd.oasis.opendocument.spreadsheet" ||
      mimeType === "application/vnd.ms-excel.sheet.macroenabled.12"
  );
}

export function isOfficeDocumentPreviewable(mimeType?: string, fileName?: string): boolean {
  const ext = fileExt(fileName);
  if (["doc", "docx", "xlsx", "xls", "xlsm", "ods", "csv"].includes(ext)) return true;
  return (
    isDocxPreviewable(mimeType, fileName) ||
    isLegacyDocMime(mimeType, fileName) ||
    isSpreadsheetPreviewable(mimeType, fileName) ||
    mimeType === "text/csv"
  );
}

export function isClientDocumentPreviewable(mimeType?: string, fileName?: string): boolean {
  return (
    isDocxPreviewable(mimeType, fileName) ||
    isSpreadsheetPreviewable(mimeType, fileName)
  );
}

const SPREADSHEET_PURIFY = {
  ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "caption", "colgroup", "col"],
  ADD_ATTR: ["colspan", "rowspan", "scope", "id", "class"],
};

export async function renderDocumentPreview(
  blob: Blob,
  fileName: string,
  mimeType?: string
): Promise<{ kind: "html"; html: string } | { kind: "unsupported"; reason: string }> {
  const ext = fileExt(fileName);

  if (isLegacyDocMime(mimeType, fileName)) {
    return {
      kind: "unsupported",
      reason: "Could not preview this .doc file in the browser.",
    };
  }

  if (isDocxPreviewable(mimeType, fileName)) {
    try {
      const mammoth = await import("mammoth");
      const arrayBuffer = await blob.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = DOMPurify.sanitize(result.value, { USE_PROFILES: { html: true } });
      if (!html.trim()) {
        return { kind: "unsupported", reason: "Document appears to be empty." };
      }
      return { kind: "html", html };
    } catch {
      return { kind: "unsupported", reason: "Could not read this Word document." };
    }
  }

  if (isSpreadsheetPreviewable(mimeType, fileName)) {
    try {
      const XLSX = await import("xlsx");
      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return { kind: "unsupported", reason: "Spreadsheet is empty." };
      }
      const html = XLSX.utils.sheet_to_html(workbook.Sheets[sheetName], {
        id: "attachment-preview-sheet",
        editable: false,
      });
      const sanitized = DOMPurify.sanitize(html, SPREADSHEET_PURIFY);
      if (!sanitized.trim()) {
        return { kind: "unsupported", reason: "Spreadsheet appears to be empty." };
      }
      return { kind: "html", html: sanitized };
    } catch {
      return { kind: "unsupported", reason: "Could not read this spreadsheet." };
    }
  }

  if (ext === "csv") {
    try {
      const text = await blob.text();
      const rows = text.split(/\r?\n/).filter((line) => line.length > 0);
      const tableRows = rows
        .map((line) => {
          const cells = line.split(",").map((c) => `<td>${escapeHtml(c.trim())}</td>`).join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      const html = `<table class="w-full border-collapse text-sm"><tbody>${tableRows}</tbody></table>`;
      return { kind: "html", html: DOMPurify.sanitize(html, SPREADSHEET_PURIFY) };
    } catch {
      return { kind: "unsupported", reason: "Could not read this CSV file." };
    }
  }

  return { kind: "unsupported", reason: "Preview is not available for this file type." };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
