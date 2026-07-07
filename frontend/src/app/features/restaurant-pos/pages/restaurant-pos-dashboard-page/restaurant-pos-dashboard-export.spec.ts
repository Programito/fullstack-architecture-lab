import { describe, expect, it, vi } from 'vitest';

import type { WorkbookDocument, WorkbookWriter } from '../../../../shared/spreadsheet/workbook-writer.port';
import type { RestaurantAnalyticsReportDto } from '../../api/restaurant-analytics.models';
import {
  buildRestaurantAnalyticsWorkbookDocument,
  exportRestaurantAnalyticsWorkbook,
  type TranslateFn,
} from './restaurant-pos-dashboard-export';

// Minimal Spanish stand-in for TranslocoService#translate, covering only the
// keys this helper actually reads. Keeps the test independent of the full
// i18n dictionary while still exercising the real translation lookups.
const ES_TRANSLATIONS: Record<string, string> = {
  'restaurantPos.dashboard.export.metadata.restaurant': 'Restaurante',
  'restaurantPos.dashboard.export.metadata.period': 'Periodo',
  'restaurantPos.dashboard.export.metadata.generatedAt': 'Fecha de exportación',
  'restaurantPos.dashboard.export.sheets.summary': 'Resumen',
  'restaurantPos.dashboard.export.sheets.salesByDay': 'Ventas por día',
  'restaurantPos.dashboard.export.sheets.payments': 'Pagos',
  'restaurantPos.dashboard.export.sheets.averageTicketByDay': 'Ticket medio diario',
  'restaurantPos.dashboard.export.sheets.topProducts': 'Top productos',
  'restaurantPos.dashboard.export.sheets.peakHours': 'Horas punta',
  'restaurantPos.dashboard.export.summaryMetrics.revenue': 'Ingresos',
  'restaurantPos.dashboard.export.summaryMetrics.orders': 'Pedidos',
  'restaurantPos.dashboard.export.summaryMetrics.averageTicket': 'Ticket medio',
  'restaurantPos.dashboard.export.summaryMetrics.tableTurnover': 'Rotación media de mesa (min)',
  'restaurantPos.dashboard.export.columns.metric': 'Métrica',
  'restaurantPos.dashboard.export.columns.value': 'Valor',
  'restaurantPos.dashboard.tableHeaders.date': 'Fecha',
  'restaurantPos.dashboard.tableHeaders.product': 'Producto',
  'restaurantPos.dashboard.tableHeaders.method': 'Método',
  'restaurantPos.dashboard.tableHeaders.hour': 'Hora',
  'restaurantPos.dashboard.tableHeaders.operations': 'Operaciones',
  'restaurantPos.dashboard.tableHeaders.averageTicket': 'Ticket medio',
  'restaurantPos.dashboard.charts.revenue': 'Ingresos',
  'restaurantPos.dashboard.charts.quantity': 'Cantidad',
  'restaurantPos.dashboard.charts.amount': 'Importe',
  'restaurantPos.dashboard.charts.orders': 'Pedidos',
  'restaurantPos.dashboard.paymentMethods.cash': 'Efectivo',
  'restaurantPos.dashboard.paymentMethods.card': 'Tarjeta',
};

const translate: TranslateFn = (key) => ES_TRANSLATIONS[key] ?? key;

function createReport(): RestaurantAnalyticsReportDto {
  return {
    summary: { revenueCents: 120000, ordersCount: 40, averageTicketCents: 3000, averageTableTurnoverMinutes: 52 },
    previousSummary: { revenueCents: 100000, ordersCount: 40, averageTicketCents: 2500, averageTableTurnoverMinutes: 52 },
    salesByDay: [
      { date: '2026-06-23', revenueCents: 60000, ordersCount: 20 },
      { date: '2026-06-24', revenueCents: 60000, ordersCount: 15 },
    ],
    topProducts: [{ productName: 'Paella', quantity: 20, revenueCents: 40000 }],
    paymentBreakdown: [
      { method: 'cash', amountCents: 30000, count: 10 },
      { method: 'card', amountCents: 90000, count: 30 },
    ],
    peakHours: [{ hour: 21, ordersCount: 12 }],
  };
}

describe('buildRestaurantAnalyticsWorkbookDocument', () => {
  it('builds one sheet per report section with the expected names', () => {
    const document = buildRestaurantAnalyticsWorkbookDocument({
      locale: 'es',
      restaurantName: 'MesaFlow Centro',
      period: { from: '2026-06-23', to: '2026-06-24' },
      report: createReport(),
      translate,
      generatedAt: new Date('2026-07-07T10:00:00.000Z'),
    });

    expect(document.sheets.map((sheet) => sheet.name)).toEqual([
      'Resumen',
      'Ventas por día',
      'Pagos',
      'Ticket medio diario',
      'Top productos',
      'Horas punta',
    ]);
  });

  it('includes restaurant, period, and generated-at metadata in the summary sheet', () => {
    const document = buildRestaurantAnalyticsWorkbookDocument({
      locale: 'es',
      restaurantName: 'MesaFlow Centro',
      period: { from: '2026-06-23', to: '2026-06-24' },
      report: createReport(),
      translate,
      generatedAt: new Date('2026-07-07T10:00:00.000Z'),
    });

    const summarySheet = document.sheets[0];
    expect(summarySheet.metadataRows).toEqual([
      ['Restaurante', 'MesaFlow Centro'],
      ['Periodo', '2026-06-23 - 2026-06-24'],
      ['Fecha de exportación', '2026-07-07'],
    ]);
  });

  it('labels payment rows with the translated method name', () => {
    const document = buildRestaurantAnalyticsWorkbookDocument({
      locale: 'es',
      restaurantName: 'MesaFlow Centro',
      period: { from: '2026-06-23', to: '2026-06-24' },
      report: createReport(),
      translate,
    });

    const paymentsSheet = document.sheets[2];
    expect(paymentsSheet.rows).toEqual([
      ['Efectivo', 300, 10],
      ['Tarjeta', 900, 30],
    ]);
  });

  it('derives daily average ticket values in currency units from cents', () => {
    const document = buildRestaurantAnalyticsWorkbookDocument({
      locale: 'es',
      restaurantName: 'MesaFlow Centro',
      period: { from: '2026-06-23', to: '2026-06-24' },
      report: createReport(),
      translate,
    });

    const averageTicketSheet = document.sheets[3];
    expect(averageTicketSheet.rows).toEqual([
      ['2026-06-23', 20, 600, 30],
      ['2026-06-24', 15, 600, 40],
    ]);
  });
});

describe('exportRestaurantAnalyticsWorkbook', () => {
  it('delegates the built document to the provided writer', async () => {
    const expectedBlob = new Blob(['xlsx-bytes']);
    const writer: WorkbookWriter = { write: vi.fn(async () => expectedBlob) };

    const blob = await exportRestaurantAnalyticsWorkbook({
      locale: 'es',
      restaurantName: 'MesaFlow Centro',
      period: { from: '2026-06-23', to: '2026-06-24' },
      report: createReport(),
      translate,
      writer,
    });

    expect(blob).toBe(expectedBlob);
    expect(writer.write).toHaveBeenCalledTimes(1);
    const [document] = (writer.write as ReturnType<typeof vi.fn>).mock.calls[0] as [WorkbookDocument];
    expect(document.sheets).toHaveLength(6);
  });
});
