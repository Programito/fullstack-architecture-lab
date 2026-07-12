import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { forkJoin, of } from 'rxjs';

import { BackLink } from '../../../../shared/ui/back-link/back-link';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { Chart, type ChartPointSelection, type ChartSeries } from '../../../../shared/ui/chart/chart';
import { Combobox, type ComboboxOption } from '../../../../shared/ui/combobox/combobox';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Table, type TableAction, type TableBadgeCell, type TableColumn, type TableRow } from '../../../../shared/ui/table/table';
import { Tooltip } from '../../../../shared/ui/tooltip/tooltip';
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
  imports: [DatePipe, FormsModule, TranslocoPipe, BackLink, Badge, Button, Card, Chart, Combobox, Dialog, Icon, Table, Tooltip],
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
  protected readonly filtersInfoOpen = signal(false);
  protected readonly showOperationsFilters = computed(() => this.view() !== 'audit');
  protected readonly showAuditFilters = computed(() => this.view() !== 'operations');
  protected readonly showSplitFilterSections = computed(() => this.showOperationsFilters() && this.showAuditFilters());
  protected readonly filterHelpItems = [
    { labelKey: 'developer.logs.filters.view', descriptionKey: 'developer.logs.filters.viewHint' },
    { labelKey: 'developer.logs.filters.rangeLabel', descriptionKey: 'developer.logs.filters.rangeHint' },
    { labelKey: 'developer.logs.filters.clientOrigin', descriptionKey: 'developer.logs.filters.clientOriginHint' },
    { labelKey: 'developer.logs.filters.level', descriptionKey: 'developer.logs.filters.levelHint' },
    { labelKey: 'developer.logs.filters.path', descriptionKey: 'developer.logs.filters.pathHint' },
    { labelKey: 'developer.logs.filters.search', descriptionKey: 'developer.logs.filters.searchHint' },
    { labelKey: 'developer.logs.filters.entityType', descriptionKey: 'developer.logs.filters.entityTypeHint' },
    { labelKey: 'developer.logs.filters.result', descriptionKey: 'developer.logs.filters.resultHint' },
  ] as const;
  protected readonly kpiHelpItems = [
    { labelKey: 'developer.logs.metrics.requests', descriptionKey: 'developer.logs.metrics.requestsHint' },
    { labelKey: 'developer.logs.metrics.errors', descriptionKey: 'developer.logs.metrics.errorsHint' },
    { labelKey: 'developer.logs.metrics.errorRate', descriptionKey: 'developer.logs.metrics.errorRateHint' },
    { labelKey: 'developer.logs.metrics.audit', descriptionKey: 'developer.logs.metrics.auditHint' },
    { labelKey: 'developer.logs.metrics.latency', descriptionKey: 'developer.logs.metrics.latencyHint' },
  ] as const;
  protected readonly originHelpItems = [
    { labelKey: 'developer.logs.origins.web-admin', descriptionKey: 'developer.logs.filters.originDescriptions.web-admin' },
    { labelKey: 'developer.logs.origins.web-demo', descriptionKey: 'developer.logs.filters.originDescriptions.web-demo' },
    { labelKey: 'developer.logs.origins.web-pos', descriptionKey: 'developer.logs.filters.originDescriptions.web-pos' },
    { labelKey: 'developer.logs.origins.apk-customer', descriptionKey: 'developer.logs.filters.originDescriptions.apk-customer' },
    { labelKey: 'developer.logs.origins.backend', descriptionKey: 'developer.logs.filters.originDescriptions.backend' },
  ] as const;
  protected readonly insightCards = computed<DeveloperLogInsightCardVm[]>(() => buildInsightCards({
    view: this.view(),
    filters: this.filters(),
    summary: this.summary(),
    origins: this.breakdown().origins,
    topErrorEvents: this.topErrorEvents(),
    topSlowPaths: this.topSlowPaths(),
    events: this.timelineEvents(),
    translate: (key: string) => this.transloco.translate(key),
    clientOriginLabel: (origin: string) => this.clientOriginLabel(origin),
  }));

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
      { key: 'actions', header: this.transloco.translate('developer.logs.table.actionsHeader'), align: 'right' },
    ];
  });

  protected comparisonLabel(
    metric: 'totalRequests' | 'errorCount' | 'errorRate' | 'auditEvents' | 'p95DurationMs',
    format: 'number' | 'percent',
  ): string {
    const delta = this.summary()?.comparison?.delta[metric];
    if (!delta) return this.transloco.translate('developer.logs.metrics.noComparison');

    if (format === 'percent') {
      return delta.percent == null
        ? this.transloco.translate('developer.logs.metrics.noComparison')
        : `${signedValue(delta.percent)}% ${this.transloco.translate('developer.logs.metrics.vsPrevious')}`;
    }

    return `${signedValue(delta.absolute)} ${this.transloco.translate('developer.logs.metrics.vsPrevious')}`;
  }

  protected comparisonTone(metric: 'totalRequests' | 'errorCount' | 'errorRate' | 'auditEvents' | 'p95DurationMs'): 'good' | 'bad' | 'neutral' {
    const delta = this.summary()?.comparison?.delta[metric];
    if (!delta || delta.direction === 'flat') return 'neutral';

    const higherIsWorse = metric === 'errorCount' || metric === 'errorRate' || metric === 'p95DurationMs';
    if (higherIsWorse) {
      return delta.direction === 'up' ? 'bad' : 'good';
    }

    return delta.direction === 'up' ? 'good' : 'bad';
  }

  protected focusInsight(card: DeveloperLogInsightCardVm): void {
    if (!card.action) return;

    if (card.action.kind === 'audit-actor') {
      this.applyFilterState({ actorUserId: card.action.actorUserId, category: 'audit' }, 'audit');
      return;
    }

    if (card.action.kind === 'audit-entity') {
      this.applyFilterState({ entityType: card.action.entityType, category: 'audit', entityId: '' }, 'audit');
      return;
    }

    if (card.action.kind === 'audit-result') {
      this.applyFilterState({ result: card.action.result, category: 'audit' }, 'audit');
      return;
    }

    if (card.action.kind === 'audit-origin') {
      this.applyFilterState({ clientOrigin: card.action.clientOrigin, category: 'audit' }, 'audit');
      return;
    }

    if (card.action.kind === 'error') {
      this.applyFilterState({ category: 'request', level: 'error' }, 'operations');
      return;
    }

    if (card.action.kind === 'latency') {
      this.applyFilterState({ category: 'request', level: '' }, 'operations');
      return;
    }

    if (card.action.kind === 'top-error') {
      this.focusTopError(card.action.event, card.action.path, card.action.clientOrigin);
      return;
    }

    if (card.action.kind === 'slow-path') {
      this.focusSlowPath(card.action.path, card.action.clientOrigin);
      return;
    }

    if (card.action.kind === 'origin') {
      this.focusBreakdownOrigin(card.action.originKey);
    }
  }

  protected handleRowAction(event: { action: string; row: TableRow }): void {
    if (event.action === 'origin' && typeof event.row['clientOriginFilter'] === 'string') {
      const clientOrigin = parseClientOrigin(String(event.row['clientOriginFilter']));
      if (clientOrigin) {
        this.focusOrigin(clientOrigin);
      }
      return;
    }

    if (event.action === 'path' && typeof event.row['pathFilter'] === 'string') {
      this.applyFilterState(
        {
          path: String(event.row['pathFilter']),
        },
        this.view(),
      );
      return;
    }

    if (event.action === 'actor' && typeof event.row['actorUserIdFilter'] === 'string') {
      this.applyFilterState(
        {
          actorUserId: String(event.row['actorUserIdFilter']),
        },
        'audit',
      );
      return;
    }

    if (event.action === 'result' && typeof event.row['resultFilter'] === 'string') {
      const result = parseResult(String(event.row['resultFilter']));
      this.applyFilterState(
        {
          result,
        },
        result ? 'audit' : this.view(),
      );
    }
  }

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

  protected openFiltersInfo(): void {
    this.filtersInfoOpen.set(true);
  }

  protected closeFiltersInfo(): void {
    this.filtersInfoOpen.set(false);
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

  protected clearActiveFilter(key: 'clientOrigin' | 'path'): void {
    if (key === 'clientOrigin') {
      this.applyFilterState({ clientOrigin: '' }, this.view());
      return;
    }

    this.applyFilterState({ path: '' }, this.view());
  }

  protected clearFilters(): void {
    const defaults = defaultFilters();
    this.filters.set(defaults);
    this.page.set(1);
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

  protected focusSlowPathChart(selection: ChartPointSelection): void {
    const match = this.topSlowPaths().find((entry) => entry.path === selection.category);
    this.focusSlowPath(selection.category, match?.clientOrigin ?? '');
  }

  protected focusErrorTrendChart(selection: ChartPointSelection): void {
    this.applyFilterState(
      {
        category: 'request',
        level: 'error',
        path: selection.seriesName,
        search: '',
      },
      'operations',
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
      level: buildLevelBadge(item.level),
      category: buildCategoryBadge(item.category),
      clientOrigin: buildOriginBadge(this.clientOriginLabel(item.clientOrigin)),
      event: item.event,
      message: item.message,
      pathFilter: item.path ?? '',
      clientOriginFilter: item.clientOrigin,
      actorUserIdFilter: item.userId ?? '',
      resultFilter: item.result ?? '',
      actions: buildRowActions(item, this.transloco),
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

type DeveloperLogInsightCardVm = {
  titleKey: string;
  summary: string;
  detail: string;
  tone: 'neutral' | 'good' | 'bad';
  action:
    | { kind: 'audit-actor'; actorUserId: string }
    | { kind: 'audit-entity'; entityType: string }
    | { kind: 'audit-result'; result: 'failed' }
    | { kind: 'audit-origin'; clientOrigin: DeveloperLogFilters['clientOrigin'] }
    | { kind: 'error' | 'latency' }
    | { kind: 'top-error'; event: string; path: string | null; clientOrigin: DeveloperLogFilters['clientOrigin'] }
    | { kind: 'slow-path'; path: string; clientOrigin: DeveloperLogFilters['clientOrigin'] }
    | { kind: 'origin'; originKey: string }
    | null;
};

function signedValue(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`;
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

function buildInsightCards(input: {
  view: DeveloperLogsView;
  filters: DeveloperLogFilters;
  summary: DeveloperLogSummaryDto | null;
  origins: Array<{ key: string; count: number }>;
  topErrorEvents: DeveloperLogSummaryDto['topErrorEvents'];
  topSlowPaths: DeveloperLogSummaryDto['topSlowPaths'];
  events: DeveloperLogEventDto[];
  translate: (key: string) => string;
  clientOriginLabel: (origin: string) => string;
}): DeveloperLogInsightCardVm[] {
  if (input.view === 'audit') {
    return buildAuditInsightCards({
      filters: input.filters,
      summary: input.summary,
      origins: input.origins,
      events: input.events,
      translate: input.translate,
      clientOriginLabel: input.clientOriginLabel,
    });
  }

  return buildOperationsInsightCards({
    summary: input.summary,
    origins: input.origins,
    topErrorEvents: input.topErrorEvents,
    topSlowPaths: input.topSlowPaths,
    translate: input.translate,
  });
}

function buildOperationsInsightCards(input: {
  summary: DeveloperLogSummaryDto | null;
  origins: Array<{ key: string; count: number }>;
  topErrorEvents: DeveloperLogSummaryDto['topErrorEvents'];
  topSlowPaths: DeveloperLogSummaryDto['topSlowPaths'];
  translate: (key: string) => string;
}): DeveloperLogInsightCardVm[] {
  const summary = input.summary;
  const comparison = summary?.comparison;
  const totalRequests = summary?.totalRequests ?? 0;
  const errorRate = summary?.errorRate ?? 0;
  const topError = input.topErrorEvents[0] ?? null;
  const topSlowPath = input.topSlowPaths[0] ?? null;
  const busiestOrigin = input.origins[0] ?? null;
  const errorRateDelta = comparison?.delta.errorRate ?? null;
  const latencyDelta = comparison?.delta.p95DurationMs ?? null;
  const errorCountDelta = comparison?.delta.errorCount ?? null;

  const overview: DeveloperLogInsightCardVm = {
    titleKey: 'developer.logs.insights.overview',
    summary: `${totalRequests} ${input.translate('developer.logs.insights.requests')}`,
    detail: `${errorRate}% ${input.translate('developer.logs.metrics.errorRate')}`,
    tone: 'neutral',
    action: null,
  };

  let mainAlert: DeveloperLogInsightCardVm = {
    titleKey: 'developer.logs.insights.mainAlert',
    summary: input.translate('developer.logs.insights.noAlert'),
    detail: input.translate('developer.logs.insights.systemStable'),
    tone: 'good',
    action: null,
  };

  if ((errorRateDelta?.direction ?? 'flat') === 'up' && errorRateDelta) {
    mainAlert = {
      titleKey: 'developer.logs.insights.mainAlert',
      summary: input.translate('developer.logs.insights.errorRateRising'),
      detail: `${signedValue(errorRateDelta.absolute)} pp ${input.translate('developer.logs.metrics.vsPrevious')}`,
      tone: 'bad',
      action: { kind: 'error' },
    };
  } else if ((latencyDelta?.direction ?? 'flat') === 'up' && latencyDelta) {
    mainAlert = {
      titleKey: 'developer.logs.insights.mainAlert',
      summary: input.translate('developer.logs.insights.latencyRising'),
      detail: `${signedValue(latencyDelta.absolute)} ms ${input.translate('developer.logs.metrics.vsPrevious')}`,
      tone: 'bad',
      action: { kind: 'latency' },
    };
  } else if ((errorCountDelta?.direction ?? 'flat') === 'up' && errorCountDelta) {
    mainAlert = {
      titleKey: 'developer.logs.insights.mainAlert',
      summary: input.translate('developer.logs.insights.errorsRising'),
      detail: `${signedValue(errorCountDelta.absolute)} ${input.translate('developer.logs.metrics.vsPrevious')}`,
      tone: 'bad',
      action: { kind: 'error' },
    };
  }

  let currentFocus: DeveloperLogInsightCardVm = {
    titleKey: 'developer.logs.insights.currentFocus',
    summary: input.translate('developer.logs.insights.noFocus'),
    detail: input.translate('developer.logs.insights.awaitingSignals'),
    tone: 'neutral',
    action: null,
  };

  if (topError) {
    currentFocus = {
      titleKey: 'developer.logs.insights.currentFocus',
      summary: topError.event,
      detail: topError.path ?? topError.clientOrigin,
      tone: 'bad',
      action: { kind: 'top-error', event: topError.event, path: topError.path, clientOrigin: topError.clientOrigin },
    };
  } else if (topSlowPath) {
    currentFocus = {
      titleKey: 'developer.logs.insights.currentFocus',
      summary: topSlowPath.path,
      detail: `${topSlowPath.p95DurationMs} ms`,
      tone: 'bad',
      action: { kind: 'slow-path', path: topSlowPath.path, clientOrigin: topSlowPath.clientOrigin },
    };
  } else if (busiestOrigin) {
    currentFocus = {
      titleKey: 'developer.logs.insights.currentFocus',
      summary: busiestOrigin.key,
      detail: `${busiestOrigin.count} ${input.translate('developer.logs.insights.events')}`,
      tone: 'neutral',
      action: { kind: 'origin', originKey: busiestOrigin.key },
    };
  }

  return [overview, mainAlert, currentFocus];
}

function buildAuditInsightCards(input: {
  filters: DeveloperLogFilters;
  summary: DeveloperLogSummaryDto | null;
  origins: Array<{ key: string; count: number }>;
  events: DeveloperLogEventDto[];
  translate: (key: string) => string;
  clientOriginLabel: (origin: string) => string;
}): DeveloperLogInsightCardVm[] {
  const actorCounts = countEvents(input.events, (event) => event.userId?.trim() ?? '');
  const entityCounts = countEvents(input.events, (event) => event.entityType?.trim() ?? '');
  const failedCount = input.events.filter((event) => event.result === 'failed').length;
  const authCount = input.events.filter((event) => event.entityType === 'auth').length;
  const topActor = actorCounts[0] ?? null;
  const topEntity = entityCounts[0] ?? null;
  const topOrigin = input.origins[0] ?? null;

  const activityCard: DeveloperLogInsightCardVm = topActor
    ? {
        titleKey: 'developer.logs.insights.auditActivity',
        summary: topActor.key,
        detail: `${topActor.count} ${input.translate('developer.logs.insights.auditActions')}`,
        tone: 'neutral',
        action: { kind: 'audit-actor', actorUserId: topActor.key },
      }
    : topEntity
      ? {
          titleKey: 'developer.logs.insights.auditActivity',
          summary: topEntity.key,
          detail: `${topEntity.count} ${input.translate('developer.logs.insights.auditChanges')}`,
          tone: 'neutral',
          action: { kind: 'audit-entity', entityType: topEntity.key },
        }
      : {
          titleKey: 'developer.logs.insights.auditActivity',
          summary: `${input.summary?.auditEvents ?? 0} ${input.translate('developer.logs.metrics.audit')}`,
          detail: input.translate('developer.logs.insights.auditActivityFallback'),
          tone: 'neutral',
          action: null,
        };

  const riskCard: DeveloperLogInsightCardVm = failedCount > 0
    ? {
        titleKey: 'developer.logs.insights.auditRisk',
        summary: input.translate('developer.logs.insights.failedAuditActions'),
        detail: `${failedCount} ${input.translate('developer.logs.sections.occurrences')}`,
        tone: 'bad',
        action: { kind: 'audit-result', result: 'failed' },
      }
    : authCount > 0
      ? {
          titleKey: 'developer.logs.insights.auditRisk',
          summary: input.translate('developer.logs.insights.authNeedsReview'),
          detail: `${authCount} ${input.translate('developer.logs.insights.auditActions')}`,
          tone: 'neutral',
          action: { kind: 'audit-entity', entityType: 'auth' },
        }
      : {
          titleKey: 'developer.logs.insights.auditRisk',
          summary: input.translate('developer.logs.insights.noRiskHighlighted'),
          detail: input.translate('developer.logs.insights.auditRiskFallback'),
          tone: 'good',
          action: null,
        };

  const focusCard: DeveloperLogInsightCardVm = topEntity
    ? {
        titleKey: 'developer.logs.insights.currentFocus',
        summary: topEntity.key,
        detail: `${topEntity.count} ${input.translate('developer.logs.insights.auditChanges')}`,
        tone: 'neutral',
        action: { kind: 'audit-entity', entityType: topEntity.key },
      }
    : topOrigin
      ? {
          titleKey: 'developer.logs.insights.currentFocus',
          summary: input.clientOriginLabel(topOrigin.key),
          detail: `${topOrigin.count} ${input.translate('developer.logs.insights.events')}`,
          tone: 'neutral',
          action: { kind: 'audit-origin', clientOrigin: parseClientOrigin(topOrigin.key) ?? '' },
        }
      : {
          titleKey: 'developer.logs.insights.currentFocus',
          summary: input.translate('developer.logs.insights.noFocus'),
          detail: input.translate('developer.logs.insights.awaitingSignals'),
          tone: 'neutral',
          action: null,
        };

  return [activityCard, riskCard, focusCard];
}

function countEvents(
  events: DeveloperLogEventDto[],
  keySelector: (event: DeveloperLogEventDto) => string,
): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();

  for (const event of events) {
    const key = keySelector(event);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function buildRowActions(item: DeveloperLogEventDto, transloco: TranslocoService): TableAction[] {
  const actions: TableAction[] = [];

  if (item.clientOrigin) {
    actions.push({
      value: 'origin',
      label: transloco.translate('developer.logs.table.actions.originShort'),
      ariaLabel: `${transloco.translate('developer.logs.table.actions.origin')} ${transloco.translate(`developer.logs.origins.${item.clientOrigin}`)}`,
    });
  }

  if (item.path) {
    actions.push({
      value: 'path',
      label: transloco.translate('developer.logs.table.actions.pathShort'),
      ariaLabel: `${transloco.translate('developer.logs.table.actions.path')} ${item.path}`,
    });
  }

  if (item.userId) {
    actions.push({
      value: 'actor',
      label: transloco.translate('developer.logs.table.actions.actorShort'),
      ariaLabel: `${transloco.translate('developer.logs.table.actions.actor')} ${item.userId}`,
    });
  }

  if (item.result) {
    actions.push({
      value: 'result',
      label: transloco.translate('developer.logs.table.actions.resultShort'),
      ariaLabel: `${transloco.translate('developer.logs.table.actions.result')} ${item.result}`,
    });
  }

  return actions;
}

function buildLevelBadge(level: DeveloperLogEventDto['level']): TableBadgeCell {
  return {
    kind: 'badge',
    label: level,
    variant: level === 'error' ? 'danger' : level === 'warn' ? 'warning' : 'neutral',
  };
}

function buildCategoryBadge(category: DeveloperLogEventDto['category']): TableBadgeCell {
  return {
    kind: 'badge',
    label: category,
    variant: category === 'audit' ? 'secondary' : category === 'request' ? 'primary' : 'neutral',
  };
}

function buildOriginBadge(origin: string): TableBadgeCell {
  return {
    kind: 'badge',
    label: origin,
    variant: 'neutral',
  };
}
