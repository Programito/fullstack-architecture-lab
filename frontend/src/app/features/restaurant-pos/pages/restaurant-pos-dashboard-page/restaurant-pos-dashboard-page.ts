import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { mapHttpError } from '../../../../core/errors/http-error.mapper';
import { addDaysToIsoDate, currentZonedDateIso, daysBetweenIsoDates, zonedDayRangeUtc } from '../../../../shared/utils/date/restaurant-timezone';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge, type BadgeVariant } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Chart, type ChartSeries } from '../../../../shared/ui/chart/chart';
import { DatePicker, type DateRangeValue } from '../../../../shared/ui/date-picker/date-picker';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SegmentedControl, type SegmentedControlOption } from '../../../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { Table, type TableColumn, type TableRow } from '../../../../shared/ui/table/table';
import { RestaurantAnalyticsApiService } from '../../api/restaurant-analytics-api.service';
import type { RestaurantAnalyticsReportDto } from '../../api/restaurant-analytics.models';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { exportRestaurantAnalyticsWorkbook, triggerRestaurantAnalyticsWorkbookDownload } from './restaurant-pos-dashboard-export';

type QuickRange = 'today' | '7d' | '30d' | 'custom';
type DateInputs = { from: string; to: string };
type Delta = { pct: number; variant: BadgeVariant; direction: 'up' | 'down' | 'flat' };
type DailyAverageTicketPoint = { date: string; revenueCents: number; ordersCount: number; averageTicketCents: number };
type PaymentShareRow = { method: string; share: number; shareLabel: string };
type DashboardViewMode = 'chart' | 'table';
type ActiveFilterChip = { key: 'range' | 'from' | 'to'; label: string; removable: boolean };
type DashboardUiState = {
  quickRange: QuickRange;
  dateInputs: DateInputs;
  viewMode: DashboardViewMode;
  filtersExpanded: boolean;
};

const MAX_RANGE_DAYS = 366;
const QUICK_RANGES = ['today', '7d', '30d'] as const;
type ConcreteQuickRange = (typeof QUICK_RANGES)[number];

@Component({
  selector: 'app-restaurant-pos-dashboard-page',
  imports: [TranslocoPipe, Alert, Badge, Button, Chart, DatePicker, EmptyState, Icon, SegmentedControl, Skeleton, Spinner, Table],
  templateUrl: './restaurant-pos-dashboard-page.html',
  styleUrl: './restaurant-pos-dashboard-page.css',
})
export class RestaurantPosDashboardPage {
  private readonly api = inject(RestaurantAnalyticsApiService);
  private readonly restaurantContext = inject(RestaurantContextStore);
  private readonly transloco = inject(TranslocoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly report = signal<RestaurantAnalyticsReportDto | null>(null);
  protected readonly rangeClamped = signal(false);
  protected readonly exportingExcel = signal(false);
  protected readonly showDataTables: ReturnType<typeof signal<boolean>>;
  protected readonly filtersExpanded: ReturnType<typeof signal<boolean>>;
  protected readonly quickRange: ReturnType<typeof signal<QuickRange>>;
  protected readonly dateInputs: ReturnType<typeof signal<DateInputs>>;

  protected readonly hasData = computed(() => (this.report()?.summary.ordersCount ?? 0) > 0);

  // Reserves a stable number of rows for the payment-share skeleton so the
  // panel does not collapse to zero height while the report is loading.
  protected readonly paymentMixSkeletonRows = [0, 1, 2] as const;

  protected readonly revenueDelta = computed(() =>
    computeDelta(this.report()?.summary.revenueCents, this.report()?.previousSummary.revenueCents),
  );
  protected readonly ordersDelta = computed(() =>
    computeDelta(this.report()?.summary.ordersCount, this.report()?.previousSummary.ordersCount),
  );
  protected readonly averageTicketDelta = computed(() =>
    computeDelta(this.report()?.summary.averageTicketCents, this.report()?.previousSummary.averageTicketCents),
  );
  protected readonly turnoverDelta = computed(() =>
    // Fewer minutes to turn a table over is the improvement here, unlike the other three KPIs.
    computeDelta(this.report()?.summary.averageTableTurnoverMinutes, this.report()?.previousSummary.averageTableTurnoverMinutes, false),
  );

  protected readonly quickRangeOptions = computed<SegmentedControlOption[]>(() => {
    this.activeLang();
    return QUICK_RANGES.map((value) => ({
      value,
      label: this.transloco.translate(`restaurantPos.dashboard.ranges.${value}`),
    }));
  });

  protected readonly salesByDayCategories = computed(() => (this.report()?.salesByDay ?? []).map((point) => point.date));
  protected readonly salesByDaySeries = computed<ChartSeries[]>(() => {
    this.activeLang();
    return [
      {
        name: this.transloco.translate('restaurantPos.dashboard.charts.revenue'),
        values: (this.report()?.salesByDay ?? []).map((point) => point.revenueCents / 100),
      },
    ];
  });

  protected readonly topProductsCategories = computed(() => (this.report()?.topProducts ?? []).map((entry) => entry.productName));
  protected readonly topProductsSeries = computed<ChartSeries[]>(() => {
    this.activeLang();
    return [
      {
        name: this.transloco.translate('restaurantPos.dashboard.charts.quantity'),
        values: (this.report()?.topProducts ?? []).map((entry) => entry.quantity),
      },
    ];
  });

  protected readonly paymentBreakdownCategories = computed(() =>
    (this.report()?.paymentBreakdown ?? []).map((entry) => this.paymentMethodLabel(entry.method)),
  );
  protected readonly paymentBreakdownSeries = computed<ChartSeries[]>(() => {
    this.activeLang();
    return [
      {
        name: this.transloco.translate('restaurantPos.dashboard.charts.amount'),
        values: (this.report()?.paymentBreakdown ?? []).map((entry) => entry.amountCents / 100),
      },
    ];
  });
  protected readonly paymentShareRows = computed<PaymentShareRow[]>(() => {
    this.activeLang();
    return (this.report()?.paymentBreakdown ?? []).map((entry) => {
      const share = this.paymentShare(entry.amountCents);
      return {
        method: this.paymentMethodLabel(entry.method),
        share: Math.round(share * 1000) / 10,
        shareLabel: this.formatPercentage(share),
      };
    });
  });

  protected readonly peakHoursCategories = computed(() => (this.report()?.peakHours ?? []).map((entry) => `${entry.hour}h`));
  protected readonly peakHoursSeries = computed<ChartSeries[]>(() => {
    this.activeLang();
    return [
      {
        name: this.transloco.translate('restaurantPos.dashboard.charts.orders'),
        values: (this.report()?.peakHours ?? []).map((entry) => entry.ordersCount),
      },
    ];
  });

  protected readonly salesByDayColumns = computed<TableColumn[]>(() => {
    this.activeLang();
    return [
      { key: 'date', header: this.transloco.translate('restaurantPos.dashboard.tableHeaders.date') },
      { key: 'revenue', header: this.transloco.translate('restaurantPos.dashboard.charts.revenue') },
      { key: 'orders', header: this.transloco.translate('restaurantPos.dashboard.charts.orders') },
    ];
  });
  protected readonly salesByDayRows = computed<TableRow[]>(() =>
    (this.report()?.salesByDay ?? []).map((point) => ({
      date: point.date,
      revenue: this.formatCurrency(point.revenueCents),
      orders: point.ordersCount,
    })),
  );

  protected readonly topProductsColumns = computed<TableColumn[]>(() => {
    this.activeLang();
    return [
      { key: 'product', header: this.transloco.translate('restaurantPos.dashboard.tableHeaders.product') },
      { key: 'quantity', header: this.transloco.translate('restaurantPos.dashboard.charts.quantity') },
      { key: 'revenue', header: this.transloco.translate('restaurantPos.dashboard.charts.revenue') },
    ];
  });
  protected readonly topProductsRows = computed<TableRow[]>(() =>
    (this.report()?.topProducts ?? []).map((entry) => ({
      product: entry.productName,
      quantity: entry.quantity,
      revenue: this.formatCurrency(entry.revenueCents),
    })),
  );

  protected readonly paymentBreakdownColumns = computed<TableColumn[]>(() => {
    this.activeLang();
    return [
      { key: 'method', header: this.transloco.translate('restaurantPos.dashboard.tableHeaders.method') },
      { key: 'amount', header: this.transloco.translate('restaurantPos.dashboard.charts.amount') },
      { key: 'share', header: this.transloco.translate('restaurantPos.dashboard.tableHeaders.share') },
      { key: 'operations', header: this.transloco.translate('restaurantPos.dashboard.tableHeaders.operations') },
      { key: 'averageTicket', header: this.transloco.translate('restaurantPos.dashboard.tableHeaders.averageTicket') },
    ];
  });
  protected readonly paymentBreakdownRows = computed<TableRow[]>(() =>
    (this.report()?.paymentBreakdown ?? []).map((entry) => ({
      method: this.paymentMethodLabel(entry.method),
      amount: this.formatCurrency(entry.amountCents),
      share: this.formatPercentage(this.paymentShare(entry.amountCents)),
      operations: entry.count,
      averageTicket: this.formatCurrency(this.averageTicketForPayment(entry.amountCents, entry.count)),
      })),
  );
  protected readonly dominantPaymentMethod = computed(() => {
    const entries = this.report()?.paymentBreakdown ?? [];
    if (entries.length === 0) return null;
    return entries.reduce((current, candidate) => candidate.amountCents > current.amountCents ? candidate : current);
  });

  protected readonly averageTicketByDayPoints = computed<DailyAverageTicketPoint[]>(() =>
    (this.report()?.salesByDay ?? []).map((point) => ({
      ...point,
      averageTicketCents: point.ordersCount > 0 ? Math.round(point.revenueCents / point.ordersCount) : 0,
    })),
  );
  protected readonly averageTicketByDayCategories = computed(() => this.averageTicketByDayPoints().map((point) => point.date));
  protected readonly averageTicketByDaySeries = computed<ChartSeries[]>(() => {
    this.activeLang();
    return [
      {
        name: this.transloco.translate('restaurantPos.dashboard.metrics.averageTicket'),
        values: this.averageTicketByDayPoints().map((point) => point.averageTicketCents / 100),
      },
    ];
  });

  protected readonly peakHoursColumns = computed<TableColumn[]>(() => {
    this.activeLang();
    return [
      { key: 'hour', header: this.transloco.translate('restaurantPos.dashboard.tableHeaders.hour') },
      { key: 'orders', header: this.transloco.translate('restaurantPos.dashboard.charts.orders') },
    ];
  });
  protected readonly peakHoursRows = computed<TableRow[]>(() =>
    (this.report()?.peakHours ?? []).map((entry) => ({ hour: `${entry.hour}h`, orders: entry.ordersCount })),
  );
  protected readonly averageTicketByDayColumns = computed<TableColumn[]>(() => {
    this.activeLang();
    return [
      { key: 'date', header: this.transloco.translate('restaurantPos.dashboard.tableHeaders.date') },
      { key: 'orders', header: this.transloco.translate('restaurantPos.dashboard.charts.orders') },
      { key: 'revenue', header: this.transloco.translate('restaurantPos.dashboard.charts.revenue') },
      { key: 'averageTicket', header: this.transloco.translate('restaurantPos.dashboard.tableHeaders.averageTicket') },
    ];
  });
  protected readonly averageTicketByDayRows = computed<TableRow[]>(() =>
    this.averageTicketByDayPoints().map((point) => ({
      date: point.date,
      orders: point.ordersCount,
      revenue: this.formatCurrency(point.revenueCents),
      averageTicket: this.formatCurrency(point.averageTicketCents),
    })),
  );
  protected readonly activeFilterChips = computed<ActiveFilterChip[]>(() => {
    this.activeLang();
    const chips: ActiveFilterChip[] = [];
    const range = this.quickRange();
    const { from, to } = this.dateInputs();

    if (range !== 'custom') {
      chips.push({
        key: 'range',
        label: this.transloco.translate(`restaurantPos.dashboard.ranges.${range}`),
        removable: true,
      });
      return chips;
    }

    if (from) {
      chips.push({
        key: 'from',
        label: `${this.transloco.translate('restaurantPos.dashboard.filters.from')}: ${from}`,
        removable: true,
      });
    }

    if (to) {
      chips.push({
        key: 'to',
        label: `${this.transloco.translate('restaurantPos.dashboard.filters.to')}: ${to}`,
        removable: true,
      });
    }

    return chips;
  });
  protected readonly compactPeriodLabel = computed(() => {
    const { from, to } = this.dateInputs();
    const locale = this.activeLang();
    if (!from || !to) return null;
    return formatCompactPeriodLabel(from, to, locale);
  });
  protected readonly bestRevenueDay = computed(() => {
    const points = this.report()?.salesByDay ?? [];
    if (points.length === 0) return null;
    return points.reduce((best, point) => point.revenueCents > best.revenueCents ? point : best);
  });
  protected readonly bestRevenueDayLabel = computed(() => {
    this.activeLang();
    const bestDay = this.bestRevenueDay();
    if (!bestDay) return null;
    return this.transloco.translate('restaurantPos.dashboard.metrics.bestDayValue', { date: bestDay.date });
  });

  constructor() {
    this.restaurantContext.load();

    const initial = parseInitialState(this.route.snapshot.queryParamMap);
    this.quickRange = signal<QuickRange>(initial.quickRange);
    this.dateInputs = signal<DateInputs>(initial.dateInputs);
    this.showDataTables = signal(initial.viewMode === 'table');
    this.filtersExpanded = signal(initial.filtersExpanded);

    // The quick-range presets need the restaurant's timezone to resolve to
    // concrete dates; until it loads, dateInputs stays empty (unless a valid
    // custom range already came from the URL).
    effect(() => {
      const restaurant = this.restaurantContext.activeRestaurant();
      if (!restaurant || this.dateInputs().from) return;
      const range = this.quickRange();
      if (range === 'custom') return;
      this.dateInputs.set(quickRangeDates(range, restaurant.timezone));
    });

    effect(() => {
      const restaurant = this.restaurantContext.activeRestaurant();
      const dateInputs = this.dateInputs();
      if (!restaurant || !dateInputs.from || !dateInputs.to) return;

      this.loading.set(true);
      this.error.set(null);
      const timeZone = restaurant.timezone;
      const from = zonedDayRangeUtc(dateInputs.from, timeZone).from;
      const to = zonedDayRangeUtc(dateInputs.to, timeZone).to;

      this.api.getReport(restaurant.id, { from, to }).subscribe({
        next: (report) => {
          this.report.set(report);
          this.loading.set(false);
        },
        error: (httpError: unknown) => {
          const appError = mapHttpError(httpError);
          this.report.set(null);
          this.error.set(
            appError.code === 'invalid_analytics_range'
              ? this.transloco.translate('restaurantPos.dashboard.errors.invalidRange')
              : appError.message,
          );
          this.loading.set(false);
        },
      });
    });
  }

  protected setQuickRange(range: string): void {
    if (!isConcreteQuickRange(range)) return;

    this.quickRange.set(range);
    this.rangeClamped.set(false);
    const restaurant = this.restaurantContext.activeRestaurant();
    if (restaurant) {
      this.dateInputs.set(quickRangeDates(range, restaurant.timezone));
    } else {
      this.dateInputs.set({ from: '', to: '' });
    }
    this.updateUrl({ range, from: null, to: null });
  }

  protected setFilter(key: keyof DateInputs, value: string): void {
    let next: DateInputs = { ...this.dateInputs(), [key]: value };
    let clamped = false;

    if (next.from && next.to && daysBetweenIsoDates(next.from, next.to) < 0) {
      next = key === 'from'
        ? { ...next, to: value }
        : { ...next, from: value };
    }

    if (daysBetweenIsoDates(next.from, next.to) > MAX_RANGE_DAYS) {
      clamped = true;
      next = key === 'from'
        ? { ...next, to: addDaysToIsoDate(value, MAX_RANGE_DAYS) }
        : { ...next, from: addDaysToIsoDate(value, -MAX_RANGE_DAYS) };
    }

    this.dateInputs.set(next);
    this.rangeClamped.set(clamped);
    this.quickRange.set('custom');
    this.updateUrl({ range: 'custom', from: next.from, to: next.to });
  }

  protected setCustomRange(range: DateRangeValue): void {
    if (!range.start || !range.end) {
      return;
    }

    let next: DateInputs = { from: range.start, to: range.end };
    let clamped = false;

    if (daysBetweenIsoDates(next.from, next.to) > MAX_RANGE_DAYS) {
      clamped = true;
      next = { ...next, to: addDaysToIsoDate(next.from, MAX_RANGE_DAYS) };
    }

    this.dateInputs.set(next);
    this.rangeClamped.set(clamped);
    this.quickRange.set('custom');
    this.updateUrl({ range: 'custom', from: next.from, to: next.to });
  }

  protected toggleDataView(): void {
    const next = !this.showDataTables();
    this.showDataTables.set(next);
    this.updateUrl({ view: next ? 'table' : 'chart' });
  }

  protected toggleFilters(): void {
    const next = !this.filtersExpanded();
    this.filtersExpanded.set(next);
    this.updateUrl({ filters: next ? 'open' : 'closed' });
  }

  protected resetFilters(): void {
    this.rangeClamped.set(false);
    this.quickRange.set('7d');
    const restaurant = this.restaurantContext.activeRestaurant();
    this.dateInputs.set(restaurant ? quickRangeDates('7d', restaurant.timezone) : { from: '', to: '' });
    this.updateUrl({ range: '7d', from: null, to: null });
  }

  protected removeFilterChip(key: ActiveFilterChip['key']): void {
    if (key === 'range') {
      this.resetFilters();
      return;
    }

    const next: DateInputs = { ...this.dateInputs(), [key]: '' };
    this.quickRange.set('custom');
    this.dateInputs.set(next);
    this.updateUrl({
      range: 'custom',
      from: next.from || null,
      to: next.to || null,
    });
  }

  protected async exportExcel(): Promise<void> {
    const restaurant = this.restaurantContext.activeRestaurant();
    const report = this.report();
    const { from, to } = this.dateInputs();
    if (!restaurant || !report || !from || !to || this.exportingExcel()) return;

    this.exportingExcel.set(true);
    try {
      const blob = await exportRestaurantAnalyticsWorkbook({
        locale: this.activeLang(),
        restaurantName: restaurant.displayName || restaurant.name,
        period: { from, to },
        report,
        translate: (key, params) => this.transloco.translate(key, params),
      });
      triggerRestaurantAnalyticsWorkbookDownload(`analytics-${restaurant.id}-${from}-${to}.xlsx`, blob);
    } finally {
      this.exportingExcel.set(false);
    }
  }

  protected formatCurrency(cents: number): string {
    return new Intl.NumberFormat(this.activeLang(), { style: 'currency', currency: 'EUR' }).format(cents / 100);
  }

  protected formatPercentage(value: number): string {
    return new Intl.NumberFormat(this.activeLang(), { style: 'percent', maximumFractionDigits: 0 }).format(value);
  }

  protected paymentShare(amountCents: number): number {
    const total = this.report()?.summary.revenueCents ?? 0;
    if (total <= 0) return 0;
    return amountCents / total;
  }

  protected averageTicketForPayment(amountCents: number, count: number): number {
    if (count <= 0) return 0;
    return Math.round(amountCents / count);
  }

  protected paymentMethodLabel(method: string): string {
    this.activeLang();
    return this.transloco.translate(`restaurantPos.dashboard.paymentMethods.${method}`);
  }

  protected deltaLabel(delta: Delta): string {
    this.activeLang();
    const key = delta.direction === 'up'
      ? 'restaurantPos.dashboard.metrics.vsIncrease'
      : delta.direction === 'down'
        ? 'restaurantPos.dashboard.metrics.vsDecrease'
        : 'restaurantPos.dashboard.metrics.vsFlat';
    return this.transloco.translate(key, { pct: delta.pct });
  }

  private updateUrl(
    patch: Partial<{ range: QuickRange; from: string | null; to: string | null; view: DashboardViewMode; filters: 'open' | 'closed' }>,
  ): void {
    const range = patch.range ?? this.quickRange();
    const filters = patch.filters ?? (this.filtersExpanded() ? 'open' : 'closed');
    const view = patch.view ?? (this.showDataTables() ? 'table' : 'chart');
    const from = 'from' in patch ? patch.from : range === 'custom' ? this.dateInputs().from : null;
    const to = 'to' in patch ? patch.to : range === 'custom' ? this.dateInputs().to : null;

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        range: range !== '7d' ? range : null,
        from: range === 'custom' ? from : null,
        to: range === 'custom' ? to : null,
        view: view !== 'chart' ? view : null,
        filters: filters !== 'open' ? filters : null,
      },
      queryParamsHandling: '',
      replaceUrl: false,
    });
  }
}

function computeDelta(current: number | undefined, previous: number | undefined, higherIsBetter = true): Delta | null {
  // A zero baseline has no meaningful percentage to compare against (either
  // both periods are empty, or the current one grew from nothing).
  if (current === undefined || previous === undefined || previous === 0) return null;

  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  if (pct === 0) return { pct: 0, variant: 'neutral', direction: 'flat' };

  const isImprovement = higherIsBetter ? pct > 0 : pct < 0;
  return {
    pct: Math.abs(pct),
    variant: isImprovement ? 'success' : 'danger',
    direction: pct > 0 ? 'up' : 'down',
  };
}

function isConcreteQuickRange(value: string): value is ConcreteQuickRange {
  return (QUICK_RANGES as readonly string[]).includes(value);
}

function formatCompactPeriodLabel(from: string, to: string, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

  return `${formatter.format(new Date(`${from}T12:00:00.000Z`))} - ${formatter.format(new Date(`${to}T12:00:00.000Z`))}`;
}

function quickRangeDates(range: ConcreteQuickRange, timeZone: string): DateInputs {
  const today = currentZonedDateIso(timeZone);
  const daysBack = range === 'today' ? 0 : range === '30d' ? 29 : 6;
  return { from: addDaysToIsoDate(today, -daysBack), to: today };
}

function parseInitialState(params: { get(name: string): string | null }): DashboardUiState {
  const rawRange = params.get('range');
  const isValidRange = rawRange === 'today' || rawRange === '7d' || rawRange === '30d' || rawRange === 'custom';
  let quickRange: QuickRange = isValidRange ? (rawRange as QuickRange) : '7d';
  const viewMode: DashboardViewMode = params.get('view') === 'table' ? 'table' : 'chart';
  const filtersExpanded = params.get('filters') !== 'closed';

  if (quickRange === 'custom') {
    const from = params.get('from');
    const to = params.get('to');
    if (isValidIsoDate(from) && isValidIsoDate(to) && from <= to) {
      return { quickRange, dateInputs: { from, to }, viewMode, filtersExpanded };
    }
    quickRange = '7d';
  }

  return { quickRange, dateInputs: { from: '', to: '' }, viewMode, filtersExpanded };
}

function isValidIsoDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}
