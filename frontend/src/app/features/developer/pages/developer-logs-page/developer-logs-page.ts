import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';

import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { Chart, type ChartSeries } from '../../../../shared/ui/chart/chart';
import { Table, type TableColumn, type TableRow } from '../../../../shared/ui/table/table';
import { DeveloperLogsApiService } from '../../api/developer-logs-api.service';
import { AUDIT_ENTITY_TYPES } from '../../api/developer-logs.models';
import type {
  DeveloperLogBreakdownDto,
  DeveloperLogEventDto,
  DeveloperLogFilters,
  DeveloperLogsQuickRange,
  DeveloperLogsView,
  DeveloperLogSummaryDto,
  DeveloperLogTimelinePointDto,
} from '../../api/developer-logs.models';

@Component({
  selector: 'app-developer-logs-page',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, Badge, Button, Card, Chart, Table],
  templateUrl: './developer-logs-page.html',
  styleUrl: './developer-logs-page.css',
})
export class DeveloperLogsPage {
  private readonly api = inject(DeveloperLogsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  protected readonly entityTypeOptions = AUDIT_ENTITY_TYPES;
  protected readonly loading = signal(true);
  protected readonly summary = signal<DeveloperLogSummaryDto | null>(null);
  protected readonly timeline = signal<DeveloperLogTimelinePointDto[]>([]);
  protected readonly breakdown = signal<DeveloperLogBreakdownDto>({ levels: [], categories: [] });
  protected readonly rows = signal<TableRow[]>([]);
  protected readonly totalItems = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly filters = signal<DeveloperLogFilters>(defaultFilters());
  protected readonly view = signal<DeveloperLogsView>('all');
  protected readonly quickRange = signal<DeveloperLogsQuickRange>('custom');
  protected readonly selectedEvent = signal<DeveloperLogEventDto | null>(null);

  protected readonly timelineCategories = computed(() => this.timeline().map((point) => shortBucket(point.bucket)));
  protected readonly timelineSeries = computed<ChartSeries[]>(() => {
    this.activeLang();
    return [
      { name: this.transloco.translate('developer.logs.charts.series.events'), values: this.timeline().map((point) => point.total) },
      { name: this.transloco.translate('developer.logs.charts.series.errors'), values: this.timeline().map((point) => point.errors) },
      { name: this.transloco.translate('developer.logs.charts.series.audit'), values: this.timeline().map((point) => point.audit) },
    ];
  });
  protected readonly levelCategories = computed(() => this.breakdown().levels.map((entry) => entry.key));
  protected readonly levelSeries = computed<ChartSeries[]>(() => {
    this.activeLang();
    return [
      { name: this.transloco.translate('developer.logs.charts.series.levels'), values: this.breakdown().levels.map((entry) => entry.count) },
    ];
  });
  protected readonly categoryCategories = computed(() => this.breakdown().categories.map((entry) => entry.key));
  protected readonly categorySeries = computed<ChartSeries[]>(() => {
    this.activeLang();
    return [
      { name: this.transloco.translate('developer.logs.charts.series.categories'), values: this.breakdown().categories.map((entry) => entry.count) },
    ];
  });
  protected readonly columns = computed<TableColumn[]>(() => {
    this.activeLang();
    return [
      { key: 'timestamp', header: this.transloco.translate('developer.logs.table.timestamp') },
      { key: 'level', header: this.transloco.translate('developer.logs.table.level') },
      { key: 'category', header: this.transloco.translate('developer.logs.table.category') },
      { key: 'event', header: this.transloco.translate('developer.logs.table.event') },
      { key: 'message', header: this.transloco.translate('developer.logs.table.message') },
    ];
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const filters = filtersFromQueryParams(params);
      const page = parsePositiveInt(params.get('page')) ?? 1;
      const view = parseView(params.get('view'), filters.category);
      const quickRange = detectQuickRange(filters.from, filters.to);

      this.filters.set(filters);
      this.page.set(page);
      this.view.set(view);
      this.quickRange.set(quickRange);
      this.selectedEvent.set(null);
      this.load();
    });
  }

  protected applyFilters(): void {
    void this.updateUrl({ page: 1 });
  }

  protected resetFilters(): void {
    const defaults = defaultFilters();
    this.filters.set(defaults);
    this.view.set('all');
    this.quickRange.set(detectQuickRange(defaults.from, defaults.to));
    this.selectedEvent.set(null);
    void this.updateUrl({
      ...defaults,
      view: 'all',
      page: 1,
    });
  }

  protected onPageChange(page: number): void {
    void this.updateUrl({ page });
  }

  protected setView(view: DeveloperLogsView): void {
    const nextFilters: DeveloperLogFilters = {
      ...this.filters(),
      category: categoryForView(view),
    };
    this.filters.set(nextFilters);
    this.view.set(view);
    this.selectedEvent.set(null);
    void this.updateUrl({
      ...nextFilters,
      view,
      page: 1,
    });
  }

  protected setQuickRange(range: DeveloperLogsQuickRange): void {
    if (range === 'custom') return;
    this.quickRange.set(range);
    const nextFilters = {
      ...this.filters(),
      ...buildQuickRange(range),
    };
    this.filters.set(nextFilters);
    this.selectedEvent.set(null);
    void this.updateUrl({
      ...nextFilters,
      view: this.view(),
      page: 1,
    });
  }

  protected setFilter<K extends keyof DeveloperLogFilters>(key: K, value: DeveloperLogFilters[K]): void {
    this.filters.update((current) => ({ ...current, [key]: value }));
  }

  protected selectEvent(row: TableRow): void {
    const id = String(row['id'] ?? '');
    const event = this.timelineEvents().find((item) => item.id === id) ?? null;
    this.selectedEvent.set(event);
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      summary: this.api.getSummary(this.filters()),
      timeline: this.api.getTimeline(this.filters()),
      breakdown: this.api.getBreakdown(this.filters()),
      events: this.api.getEvents(this.filters(), this.page(), this.pageSize()),
    }).subscribe({
      next: ({ summary, timeline, breakdown, events }) => {
        this.summary.set(summary);
        this.timeline.set(timeline);
        this.breakdown.set(breakdown);
        this.applyEvents(events.items, events.total);
        this.loading.set(false);
      },
      error: () => {
        this.summary.set(null);
        this.timeline.set([]);
        this.breakdown.set({ levels: [], categories: [] });
        this.rows.set([]);
        this.totalItems.set(0);
        this.loading.set(false);
      },
    });
  }

  private loadEvents(): void {
    this.loading.set(true);
    this.api.getEvents(this.filters(), this.page(), this.pageSize()).subscribe({
      next: (events) => {
        this.applyEvents(events.items, events.total);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.totalItems.set(0);
        this.loading.set(false);
      },
    });
  }

  private readonly timelineEvents = signal<DeveloperLogEventDto[]>([]);

  private applyEvents(items: DeveloperLogEventDto[], total: number): void {
    this.timelineEvents.set(items);
    this.totalItems.set(total);
    this.rows.set(items.map((item) => ({
      id: item.id,
      timestamp: formatDate(item.timestamp),
      level: item.level,
      category: item.category,
      event: item.event,
      message: item.message,
    })));
    const current = this.selectedEvent();
    if (current) {
      this.selectedEvent.set(items.find((item) => item.id === current.id) ?? null);
    }
  }

  private updateUrl(patch: Partial<DeveloperLogsQueryState>): Promise<boolean> {
    const state: DeveloperLogsQueryState = {
      ...this.filters(),
      page: this.page(),
      view: this.view(),
      ...patch,
    };

    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: buildQueryParams(state),
      queryParamsHandling: '',
      replaceUrl: false,
    });
  }
}

type DeveloperLogsQueryState = DeveloperLogFilters & {
  page: number;
  view: DeveloperLogsView;
};

function filtersFromQueryParams(params: { get(name: string): string | null }): DeveloperLogFilters {
  const defaults = defaultFilters();
  return {
    from: normalizeDateInput(params.get('from')) ?? defaults.from,
    to: normalizeDateInput(params.get('to')) ?? defaults.to,
    level: parseLevel(params.get('level')),
    category: parseCategory(params.get('category')),
    path: params.get('path') ?? '',
    actorUserId: params.get('actorUserId') ?? '',
    restaurantId: params.get('restaurantId') ?? '',
    entityType: params.get('entityType') ?? '',
    entityId: params.get('entityId') ?? '',
    result: parseResult(params.get('result')),
    search: params.get('search') ?? '',
  };
}

function parseLevel(value: string | null): DeveloperLogFilters['level'] {
  return value === 'info' || value === 'warn' || value === 'error' ? value : '';
}

function parseCategory(value: string | null): DeveloperLogFilters['category'] {
  return value === 'request' || value === 'error' || value === 'audit' || value === 'client' ? value : '';
}

function parseResult(value: string | null): DeveloperLogFilters['result'] {
  return value === 'attempted' || value === 'succeeded' || value === 'failed' ? value : '';
}

function parseView(value: string | null, category: DeveloperLogFilters['category']): DeveloperLogsView {
  if (value === 'all' || value === 'operations' || value === 'audit') return value;
  if (category === 'audit') return 'audit';
  if (category === 'request') return 'operations';
  return 'all';
}

function categoryForView(view: DeveloperLogsView): DeveloperLogFilters['category'] {
  if (view === 'audit') return 'audit';
  if (view === 'operations') return 'request';
  return '';
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeDateInput(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : toInputDate(date);
}

function detectQuickRange(from: string, to: string): DeveloperLogsQuickRange {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return 'custom';
  const diffHours = Math.round((toDate.getTime() - fromDate.getTime()) / (60 * 60 * 1000));
  if (diffHours === 1) return '1h';
  if (diffHours === 6) return '6h';
  if (diffHours === 24) return '24h';
  if (diffHours === 72) return '3d';
  if (diffHours === 168) return '7d';
  return 'custom';
}

function buildQueryParams(state: DeveloperLogsQueryState): Record<string, string | number | null> {
  const defaults = defaultFilters();
  return {
    from: state.from !== defaults.from ? state.from : null,
    to: state.to !== defaults.to ? state.to : null,
    level: state.level || null,
    category: state.category || null,
    path: state.path.trim() || null,
    actorUserId: state.actorUserId.trim() || null,
    restaurantId: state.restaurantId.trim() || null,
    entityType: state.entityType.trim() || null,
    entityId: state.entityId.trim() || null,
    result: state.result || null,
    search: state.search.trim() || null,
    view: state.view !== 'all' ? state.view : null,
    page: state.page > 1 ? state.page : null,
  };
}

function defaultFilters(): DeveloperLogFilters {
  return {
    ...buildQuickRange('24h'),
    level: '',
    category: '',
    path: '',
    actorUserId: '',
    restaurantId: '',
    entityType: '',
    entityId: '',
    result: '',
    search: '',
  };
}

function buildQuickRange(range: DeveloperLogsQuickRange): Pick<DeveloperLogFilters, 'from' | 'to'> {
  const to = new Date();
  const hours = range === '1h'
    ? 1
    : range === '6h'
      ? 6
      : range === '3d'
        ? 24 * 3
        : range === '7d'
          ? 24 * 7
          : 24;
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
  return {
    from: toInputDate(from),
    to: toInputDate(to),
  };
}

function toInputDate(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function shortBucket(bucket: string): string {
  return bucket.replace('T', ' ').slice(5, 16);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}
