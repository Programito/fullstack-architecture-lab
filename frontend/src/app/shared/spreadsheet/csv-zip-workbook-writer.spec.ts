import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import type { WorkbookDocument } from './workbook-writer.port';
import { createCsvZipWorkbookWriter } from './csv-zip-workbook-writer';

async function readZipText(blob: Blob, fileName: string): Promise<string> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const entry = zip.file(fileName);
  if (!entry) throw new Error(`Missing zip entry: ${fileName}`);
  return entry.async('text');
}

describe('CsvZipWorkbookWriter', () => {
  it('writes one .csv entry per sheet, named after the sheet', async () => {
    const document: WorkbookDocument = {
      sheets: [
        { name: 'Resumen', columns: [{ header: 'Métrica', key: 'metric' }], rows: [['Ingresos']] },
        { name: 'Ventas por día', columns: [{ header: 'Fecha', key: 'date' }], rows: [['2026-06-23']] },
      ],
    };

    const blob = await createCsvZipWorkbookWriter().write(document);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    expect(Object.keys(zip.files).sort()).toEqual(['Resumen.csv', 'Ventas-por-día.csv'].sort());
  });

  it('renders metadata rows above a blank line, then the header row, then data rows', async () => {
    const document: WorkbookDocument = {
      sheets: [
        {
          name: 'Resumen',
          columns: [
            { header: 'Métrica', key: 'metric' },
            { header: 'Valor', key: 'value' },
          ],
          metadataRows: [
            ['Restaurante', 'MesaFlow Centro'],
            ['Periodo', '2026-06-23 - 2026-06-24'],
          ],
          rows: [['Ingresos', 1200]],
        },
      ],
    };

    const blob = await createCsvZipWorkbookWriter().write(document);
    const csv = await readZipText(blob, 'Resumen.csv');

    expect(csv).toBe(
      ['Restaurante,MesaFlow Centro', 'Periodo,2026-06-23 - 2026-06-24', '', 'Métrica,Valor', 'Ingresos,1200'].join('\r\n'),
    );
  });

  it('escapes commas, quotes, and newlines in cell values', async () => {
    const document: WorkbookDocument = {
      sheets: [
        {
          name: 'Pagos',
          columns: [{ header: 'Nota', key: 'note' }],
          rows: [['Contiene, coma'], ['Contiene "comillas"'], ['Contiene\nsalto de línea']],
        },
      ],
    };

    const blob = await createCsvZipWorkbookWriter().write(document);
    const csv = await readZipText(blob, 'Pagos.csv');
    const lines = csv.split('\r\n');

    expect(lines[1]).toBe('"Contiene, coma"');
    expect(lines[2]).toBe('"Contiene ""comillas"""');
    expect(lines[3]).toBe('"Contiene\nsalto de línea"');
  });

  it('writes numeric values as plain numbers, without currency formatting', async () => {
    const document: WorkbookDocument = {
      sheets: [
        {
          name: 'Ventas por día',
          columns: [{ header: 'Ingresos', key: 'revenue', format: 'currency' }],
          rows: [[1234.5]],
        },
      ],
    };

    const blob = await createCsvZipWorkbookWriter().write(document);
    const csv = await readZipText(blob, 'Ventas-por-día.csv');

    expect(csv.split('\r\n')[1]).toBe('1234.5');
  });
});
