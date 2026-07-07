import type { WorkbookDocument, WorkbookWriter } from '../../../../shared/spreadsheet/workbook-writer.port';
import { createExcelJsWorkbookWriter } from '../../../../shared/spreadsheet/exceljs-workbook-writer';
import { createCsvZipWorkbookWriter } from '../../../../shared/spreadsheet/csv-zip-workbook-writer';
import type { RestaurantAnalyticsReportDto } from '../../api/restaurant-analytics.models';

export type TranslateFn = (key: string, params?: Record<string, unknown>) => string;

export type WorkbookExportFormat = 'xlsx' | 'csv';

const WRITER_FACTORIES: Record<WorkbookExportFormat, () => WorkbookWriter> = {
  xlsx: createExcelJsWorkbookWriter,
  csv: createCsvZipWorkbookWriter,
};

export const WORKBOOK_EXPORT_FILE_EXTENSIONS: Record<WorkbookExportFormat, string> = {
  xlsx: 'xlsx',
  csv: 'zip',
};

export type BuildRestaurantAnalyticsWorkbookDocumentInput = {
  /** Reserved for future locale-aware formatting; cell values stay numeric today so Excel can format/sort them natively. */
  locale: string;
  restaurantName: string;
  period: { from: string; to: string };
  report: RestaurantAnalyticsReportDto;
  translate: TranslateFn;
  /** Overridable for tests; defaults to `new Date()`. */
  generatedAt?: Date;
};

export type ExportRestaurantAnalyticsWorkbookInput = BuildRestaurantAnalyticsWorkbookDocumentInput & {
  format: WorkbookExportFormat;
  /** Overridable so tests do not depend on the real `exceljs`/`jszip` adapters. */
  writer?: WorkbookWriter;
};

function averageTicketCents(revenueCents: number, ordersCount: number): number {
  return ordersCount > 0 ? Math.round(revenueCents / ordersCount) : 0;
}

/**
 * Builds the workbook description for the currently loaded analytics report.
 * Kept free of any spreadsheet-library dependency so it can be unit tested
 * as plain data in/data out, independent of how the file actually gets
 * written to disk.
 */
export function buildRestaurantAnalyticsWorkbookDocument(input: BuildRestaurantAnalyticsWorkbookDocumentInput): WorkbookDocument {
  const { report, restaurantName, period, translate, generatedAt = new Date() } = input;

  const paymentMethodLabel = (method: string) => translate(`restaurantPos.dashboard.paymentMethods.${method}`);

  const metadataRows = [
    [translate('restaurantPos.dashboard.export.metadata.restaurant'), restaurantName],
    [translate('restaurantPos.dashboard.export.metadata.period'), `${period.from} - ${period.to}`],
    [translate('restaurantPos.dashboard.export.metadata.generatedAt'), generatedAt.toISOString().slice(0, 10)],
  ];

  const summarySheet = {
    name: translate('restaurantPos.dashboard.export.sheets.summary'),
    columns: [
      { header: translate('restaurantPos.dashboard.export.columns.metric'), key: 'metric', width: 30 },
      { header: translate('restaurantPos.dashboard.export.columns.value'), key: 'value', width: 20 },
    ],
    metadataRows,
    rows: [
      [translate('restaurantPos.dashboard.export.summaryMetrics.revenue'), report.summary.revenueCents / 100],
      [translate('restaurantPos.dashboard.export.summaryMetrics.orders'), report.summary.ordersCount],
      [translate('restaurantPos.dashboard.export.summaryMetrics.averageTicket'), report.summary.averageTicketCents / 100],
      [translate('restaurantPos.dashboard.export.summaryMetrics.tableTurnover'), report.summary.averageTableTurnoverMinutes],
    ],
  };

  const salesByDaySheet = {
    name: translate('restaurantPos.dashboard.export.sheets.salesByDay'),
    columns: [
      { header: translate('restaurantPos.dashboard.tableHeaders.date'), key: 'date', width: 14, format: 'text' as const },
      { header: translate('restaurantPos.dashboard.charts.revenue'), key: 'revenue', width: 16, format: 'currency' as const },
      { header: translate('restaurantPos.dashboard.charts.orders'), key: 'orders', width: 12, format: 'integer' as const },
    ],
    rows: report.salesByDay.map((point) => [point.date, point.revenueCents / 100, point.ordersCount]),
  };

  const paymentsSheet = {
    name: translate('restaurantPos.dashboard.export.sheets.payments'),
    columns: [
      { header: translate('restaurantPos.dashboard.tableHeaders.method'), key: 'method', width: 18, format: 'text' as const },
      { header: translate('restaurantPos.dashboard.charts.amount'), key: 'amount', width: 16, format: 'currency' as const },
      { header: translate('restaurantPos.dashboard.tableHeaders.operations'), key: 'operations', width: 14, format: 'integer' as const },
    ],
    rows: report.paymentBreakdown.map((entry) => [paymentMethodLabel(entry.method), entry.amountCents / 100, entry.count]),
  };

  const averageTicketByDaySheet = {
    name: translate('restaurantPos.dashboard.export.sheets.averageTicketByDay'),
    columns: [
      { header: translate('restaurantPos.dashboard.tableHeaders.date'), key: 'date', width: 14, format: 'text' as const },
      { header: translate('restaurantPos.dashboard.charts.orders'), key: 'orders', width: 12, format: 'integer' as const },
      { header: translate('restaurantPos.dashboard.charts.revenue'), key: 'revenue', width: 16, format: 'currency' as const },
      { header: translate('restaurantPos.dashboard.tableHeaders.averageTicket'), key: 'averageTicket', width: 16, format: 'currency' as const },
    ],
    rows: report.salesByDay.map((point) => [
      point.date,
      point.ordersCount,
      point.revenueCents / 100,
      averageTicketCents(point.revenueCents, point.ordersCount) / 100,
    ]),
  };

  const topProductsSheet = {
    name: translate('restaurantPos.dashboard.export.sheets.topProducts'),
    columns: [
      { header: translate('restaurantPos.dashboard.tableHeaders.product'), key: 'product', width: 28, format: 'text' as const },
      { header: translate('restaurantPos.dashboard.charts.quantity'), key: 'quantity', width: 12, format: 'integer' as const },
      { header: translate('restaurantPos.dashboard.charts.revenue'), key: 'revenue', width: 16, format: 'currency' as const },
    ],
    rows: report.topProducts.map((entry) => [entry.productName, entry.quantity, entry.revenueCents / 100]),
  };

  const peakHoursSheet = {
    name: translate('restaurantPos.dashboard.export.sheets.peakHours'),
    columns: [
      { header: translate('restaurantPos.dashboard.tableHeaders.hour'), key: 'hour', width: 10, format: 'text' as const },
      { header: translate('restaurantPos.dashboard.charts.orders'), key: 'orders', width: 12, format: 'integer' as const },
    ],
    rows: report.peakHours.map((entry) => [`${entry.hour}h`, entry.ordersCount]),
  };

  return {
    sheets: [summarySheet, salesByDaySheet, paymentsSheet, averageTicketByDaySheet, topProductsSheet, peakHoursSheet],
  };
}

export async function exportRestaurantAnalyticsWorkbook(input: ExportRestaurantAnalyticsWorkbookInput): Promise<Blob> {
  const workbookDocument = buildRestaurantAnalyticsWorkbookDocument(input);
  const writer = input.writer ?? WRITER_FACTORIES[input.format]();
  return writer.write(workbookDocument);
}

export function triggerRestaurantAnalyticsWorkbookDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
