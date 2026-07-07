import type { WorkbookColumn, WorkbookDocument, WorkbookWriter } from './workbook-writer.port';

const NUMBER_FORMATS: Record<NonNullable<WorkbookColumn['format']>, string | undefined> = {
  currency: '#,##0.00 "€"',
  integer: '#,##0',
  date: 'yyyy-mm-dd',
  text: undefined,
};

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * `exceljs` adapter for the `WorkbookWriter` port. This is the only file in
 * the app that imports `exceljs` directly, so replacing it with another
 * spreadsheet library later only means writing a new class here (or in a
 * sibling file) that implements `WorkbookWriter`.
 */
export class ExcelJsWorkbookWriter implements WorkbookWriter {
  async write(document: WorkbookDocument): Promise<Blob> {
    // Dynamically imported so the library only enters the bundle when an
    // export is actually triggered, instead of the initial page load.
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();

    for (const sheet of document.sheets) {
      const worksheet = workbook.addWorksheet(sheet.name);

      for (const metadataRow of sheet.metadataRows ?? []) {
        worksheet.addRow(metadataRow);
      }
      if (sheet.metadataRows?.length) {
        worksheet.addRow([]);
      }

      const headerRow = worksheet.addRow(sheet.columns.map((column) => column.header));
      headerRow.font = { bold: true };
      const firstDataRowNumber = headerRow.number + 1;

      for (const row of sheet.rows) {
        worksheet.addRow(row);
      }

      sheet.columns.forEach((column, columnIndex) => {
        const worksheetColumn = worksheet.getColumn(columnIndex + 1);
        if (column.width) {
          worksheetColumn.width = column.width;
        }

        const numFmt = column.format ? NUMBER_FORMATS[column.format] : undefined;
        if (!numFmt) return;

        for (let rowNumber = firstDataRowNumber; rowNumber <= worksheet.rowCount; rowNumber++) {
          worksheet.getCell(rowNumber, columnIndex + 1).numFmt = numFmt;
        }
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: XLSX_MIME_TYPE });
  }
}

export function createExcelJsWorkbookWriter(): WorkbookWriter {
  return new ExcelJsWorkbookWriter();
}
