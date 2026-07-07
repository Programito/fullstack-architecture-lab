import type { WorkbookDocument, WorkbookRow, WorkbookWriter } from './workbook-writer.port';

const ZIP_MIME_TYPE = 'application/zip';

function escapeCsvCell(value: WorkbookRow[number]): string {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: WorkbookRow[]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'sheet';
}

/**
 * `jszip` adapter for the `WorkbookWriter` port. One `.csv` file per sheet,
 * bundled together in a `.zip` — CSV has no concept of multiple sheets in a
 * single file, so this is the closest equivalent to the Excel export.
 */
export class CsvZipWorkbookWriter implements WorkbookWriter {
  async write(document: WorkbookDocument): Promise<Blob> {
    // Dynamically imported so the library only enters the bundle when a CSV
    // export is actually triggered, instead of the initial page load.
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();

    for (const sheet of document.sheets) {
      const rows: WorkbookRow[] = [
        ...(sheet.metadataRows ?? []),
        ...(sheet.metadataRows?.length ? [[]] : []),
        sheet.columns.map((column) => column.header),
        ...sheet.rows,
      ];
      zip.file(`${sanitizeFileName(sheet.name)}.csv`, toCsv(rows));
    }

    return zip.generateAsync({ type: 'blob', mimeType: ZIP_MIME_TYPE });
  }
}

export function createCsvZipWorkbookWriter(): WorkbookWriter {
  return new CsvZipWorkbookWriter();
}
