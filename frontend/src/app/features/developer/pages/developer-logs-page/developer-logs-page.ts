import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { forkJoin, of } from 'rxjs';

import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { Chart, type ChartSeries } from '../../../../shared/ui/chart/chart';
import { Combobox, type ComboboxOption } from '../../../../shared/ui/combobox/combobox';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Table, type TableColumn, type TableRow } from '../../../../shared/ui/table/table';
import { DeveloperLogsApiService } from '../../api/developer-logs-api.service';
import { AUDIT_ENTITY_TYPES, CLIENT_ORIGIN_OPTIONS, KNOWN_LOG_PATH_GROUPS } from '../../api/developer-logs.models';
import type {
  DeveloperLogBreakdownDto,
  DeveloperLogErrorTrendPointDto,
  DeveloperLogEventDto,
  DeveloperLogFilters,
  DeveloperLogsQuickRange,
  DeveloperLogsView,
  DeveloperLogSummaryDto,
  DeveloperLogTimelinePointDto,
} from '../../api/developer-logs.models';

@Component({
  selector: 'app-developer-logs-page',
  imports: [DatePipe, FormsModule, RouterLink, TranslocoPipe, Badge, Button, Card, Chart, Combobox, Icon, Table],
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
  protected readonly clientOriginOptions = CLIENT_ORIGIN_OPTIONS;
  protected readonly pathGroupOptions = KNOWN_LOG_PATH_GROUPS;
  protected readonly restaurantOptions = signal<ComboboxOption[]>([]);
  protected readonly actorOptions = signal<ComboboxOption[]>([]);
  protected readonly entityOptions = signal<ComboboxOption[]>([]);
  protected readonly loading = signal(true);
  protected readonly summary = signal<DeveloperLogSummaryDto | null>(null);
  protected readonly timeline = signal<DeveloperLogTimelinePointDto[]>([]);
  protected readonly errorTrends = signal<DeveloperLogErrorTrendPointDto[]>([]);
  protected readonly breakdown = signal<DeveloperLogBreakdownDto>({ levels: [], categories: [], origins: [] });
  protected readonly rows = signal<TableRow[]>([]);
  protected readonly totalItems = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly filters = signal<DeveloperLogFilters>(defaultFilters());
  protected readonly view = signal<DeveloperLogsView>('all');
  protected readonly quickRange = signal<DeveloperLogsQuickRange>('custom');
  protected readonly selectedEvent = signal<DeveloperLogEventDto | null>(null);
  protected readonly filtersExpanded = signal(true);

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
  protected readonly originCategories = computed(() => this.breakdown().origins.map((entry) => this.clientOriginLabel(entry.key)));
  protected readonly authByOrigin = computed(() => this.summary()?.authByOrigin ?? []);
  protected readonly topSlowPaths = computed(() => this.summary()?.topSlowPaths ?? []);
  protected readonly topErrorEvents = computed(() => this.summary()?.topErrorEvents ?? []);
  protected readonly activeFilterEntries = computed(() => {
    const filters = this.filters();
    const entries: Array<{ key: string; label: string; value: string }> = [];

    if (filters.clientOrigin) {
      entries.push({
        key: 'clientOrigin',
        label: this.transloco.translate('developer.logs.filters.clientOrigin'),
        value: this.clientOriginLabel(filters.clientOrigin),
      });
    }

    if (filters.path) {
      const match = this.pathGroupOptions.find((group) => group.value === filters.path);
      entries.push({
        key: 'path',
        label: this.transloco.translate('developer.logs.filters.path'),
        value: match?.label ?? filters.path,
      });
    }

    return entries;
  });
  protected readonly authOriginCategories = computed(() => this.authByOrigin().map((entry) => this.clientOriginLabel(entry.key)));
  protected readonly authOriginSeries = computed<ChartSeries[]>(() => {
    this.activeLang();
    return [
      { name: this.transloco.translate('developer.logs.metrics.loginSucceeded'), values: this.authByOrigin().map((entry) => entry.succeeded) },
      { name: this.transloco.translate('developer.logs.metrics.loginFailed'), values: this.authByOrigin().map((entry) => entry.failed) },
    ];
  });
  protected readonly slowPathCategories = computed(() => this.topSlowPaths().map((entry) => entry.path));
  protected readonly slowPathSeries = computed<ChartSeries[]>(() => {
    this.activeLang();
    return [
      { name: this.transloco.translate('developer.logs.metrics.latency'), values: this.topSlowPaths().map((entry) => entry.p95DurationMs) },
    ];
  });
  protected readonly errorTrendCategories = computed(() => [...new Set(this.errorTrends().map((entry) => shortBucket(entry.bucket)))]);
  protected readonly errorTrendSeries = computed<ChartSeries[]>(() => {
    this.activeLang();
    const entries = this.errorTrends();
    const categories = [...new Set(entries.map((entry) => shortBucket(entry.bucket)))];
    const topPaths = [...new Set(entries.map((entry) => entry.path))].slice(0, 4);

    return topPaths.map((path) => ({
      name: path,
      values: categories.map((bucket) => entries.find((entry) => shortBucket(entry.bucket) === bucket && entry.path === path)?.count ?? 0),
    }));
  });
  protected readonly originSeries = computed<ChartSeries[]>(() => {
    this.activeLang();
    return [
      { name: this.transloco.translate('developer.logs.charts.series.origins'), values: this.breakdown().origins.map((entry) => entry.count) },
    ];
  });
  protected readonly columns = computed<TableColumn[]>(() => {
    this.activeLang();
    return [
      { key: 'timestamp', header: this.transloco.translate('developer.logs.table.timestamp') },
      { key: 'level', header: this.transloco.translate('developer.logs.table.level') },
      { key: 'category', header: this.transloco.translate('developer.logs.table.category') },
      { key: 'clientOrigin', header: this.transloco.translate('developer.logs.table.clientOrigin') },
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

    this.api.getRestaurantOptions().subscribe({
      next: (restaurants) => this.restaurantOptions.set(restaurants.map((restaurant) => ({ value: restaurant.id, label: restaurant.name }))),
      error: () => this.restaurantOptions.set([]),
    });
    this.api.getActorOptions().subscribe({
      next: (actors) => this.actorOptions.set(actors.map((actor) => ({ value: actor.id, label: actor.label }))),
      error: () => this.actorOptions.set([]),
    });

    effect(() => {
      const entityType = this.filters().entityType;
      const restaurantId = this.filters().restaurantId;
      if (!entityType) {
        this.entityOptions.set([]);
        return;
      }
      this.api.getEntityOptions(entityType, restaurantId).subscribe({
        next: (entities) => this.entityOptions.set(entities.map((entity) => ({ value: entity.id, label: entity.label }))),
        error: () => this.entityOptions.set([]),
      });
    });
  }

  protected toggleFilters(): void {
    this.filtersExpanded.update((expanded) => !expanded);
  }

  protected isClientOriginSelected(origin: DeveloperLogFilters['clientOrigin']): boolean {
    return this.filters().clientOrigin === origin;
  }

  protected setClientOriginFilter(origin: DeveloperLogFilters['clientOrigin']): void {
    this.setFilter('clientOrigin', this.isClientOriginSelected(origin) ? '' : origin);
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

  protected applyShortcut(shortcut: 'apk-customer' | 'web-demo' | 'web-pos' | 'auth' | 'payments'): void {
    if (shortcut === 'auth') {
      this.applyFilterState({ category: 'request', path: '/auth' }, 'operations');
      return;
    }

    this.applyFilterState({ category: 'request', path: '/payments' }, 'operations');
  }

  protected focusMetric(metric: 'requests' | 'errors' | 'audit' | 'latency'): void {
    if (metric === 'audit') {
      this.applyFilterState({ category: 'audit', level: '' }, 'audit');
      return;
    }

    if (metric === 'errors') {
      this.applyFilterState({ category: 'request', level: 'error' }, 'operations');
      return;
    }

    this.applyFilterState({ category: 'request', level: '' }, 'operations');
  }

  protected focusSlowPath(path: string, clientOrigin: DeveloperLogFilters['clientOrigin']): void {
    this.applyFilterState(
      {
        category: 'request',
        level: '',
        path,
        clientOrigin,
        search: '',
      },
      'operations',
    );
  }

  protected focusTopError(event: string, path: string | null, clientOrigin: DeveloperLogFilters['clientOrigin']): void {
    this.applyFilterState(
      {
        category: 'request',
        level: 'error',
        path: path ?? '',
        clientOrigin,
        search: event,
      },
      'operations',
    );
  }

  protected focusOrigin(clientOrigin: DeveloperLogFilters['clientOrigin']): void {
    this.applyFilterState(
      {
        clientOrigin,
      },
      this.view(),
    );
  }

  protected focusBreakdownOrigin(originKey: string): void {
    const clientOrigin = parseClientOrigin(originKey);
    if (!clientOrigin) return;
    this.focusOrigin(clientOrigin);
  }

  protected focusAuthOrigin(clientOrigin: DeveloperLogFilters['clientOrigin']): void {
    this.applyFilterState(
      {
        clientOrigin,
        category: 'audit',
        entityType: 'auth',
        entityId: '',
        actorUserId: '',
        result: '',
        search: '',
      },
      'audit',
    );
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
      errorTrends: this.api.getErrorTrendsByPath?.(this.filters()) ?? of([]),
      events: this.api.getEvents(this.filters(), this.page(), this.pageSize()),
    }).subscribe({
      next: ({ summary, timeline, breakdown, errorTrends, events }) => {
        this.summary.set(summary);
        this.timeline.set(timeline);
        this.breakdown.set(breakdown);
        this.errorTrends.set(errorTrends);
        this.applyEvents(events.items, events.total);
        this.loading.set(false);
      },
      error: () => {
        this.summary.set(null);
        this.timeline.set([]);
        this.errorTrends.set([]);
        this.breakdown.set({ levels: [], categories: [], origins: [] });
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
      clientOrigin: this.clientOriginLabel(item.clientOrigin),
      event: item.event,
      message: item.message,
    })));
    const current = this.selectedEvent();
    if (current) {
      this.selectedEvent.set(items.find((item) => item.id === current.id) ?? null);
    }
  }

  private applyFilterState(patch: Partial<DeveloperLogFilters>, view: DeveloperLogsView): void {
    const nextFilters: DeveloperLogFilters = {
      ...this.filters(),
      ...patch,
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

  protected clientOriginLabel(value: string): string {
    return this.transloco.translate(`developer.logs.origins.${value}`);
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
    clientOrigin: parseClientOrigin(params.get('clientOrigin')),
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

function parseClientOrigin(value: string | null): DeveloperLogFilters['clientOrigin'] {
  return value === 'web-admin' || value === 'web-demo' || value === 'web-pos' || value === 'apk-customer' || value === 'backend'
    ? value
    : '';
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
    clientOrigin: state.clientOrigin || null,
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
    clientOrigin: '',
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
