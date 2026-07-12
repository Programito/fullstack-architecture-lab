import { Component, computed, effect, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { BackLink } from '../../../../shared/ui/back-link/back-link';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SearchInput } from '../../../../shared/ui/search-input/search-input';
import { Select, type SelectOption } from '../../../../shared/ui/select/select';
import { Table, type TableBadgeCell, type TableColumn, type TableRow, type TableSort } from '../../../../shared/ui/table/table';
import { Tooltip } from '../../../../shared/ui/tooltip/tooltip';
import { DEVELOPER_TABLE_SCHEMAS } from '../../schema/developer-schema.generated';

@Component({
  selector: 'app-developer-tables-page',
  imports: [TranslocoPipe, BackLink, Button, Card, Dialog, Icon, SearchInput, Select, Table, Tooltip],
  templateUrl: './developer-tables-page.html',
  styleUrl: './developer-tables-page.css',
})
export class DeveloperTablesPage {
  private renderSequence = 0;
  private readonly sanitizer = inject(DomSanitizer);
  private readonly transloco = inject(TranslocoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly schemas = DEVELOPER_TABLE_SCHEMAS;
  private readonly knownFeatures = new Set(this.schemas.map((schema) => schema.feature));
  private readonly knownDomains = new Set(this.schemas.map((schema) => schema.domain));
  private readonly knownTableIds = new Set(this.schemas.map((schema) => schema.id));
  protected readonly searchQuery = signal('');
  protected readonly fieldSearchQuery = signal('');
  protected readonly selectedFeature = signal('');
  protected readonly selectedDomain = signal('');
  protected readonly selectedTableId = signal(this.schemas[0]?.id ?? '');
  protected readonly compactMode = signal(false);
  protected readonly summarySort = signal<TableSort | null>({ key: 'name', direction: 'asc' });
  protected readonly filtersExpanded = signal(true);
  protected readonly diagramRequested = signal(false);
  protected readonly diagramSvg = signal<SafeHtml | null>(null);
  protected readonly diagramError = signal('');
  protected readonly mermaidSourceOpen = signal(false);
  protected readonly filtersInfoOpen = signal(false);
  protected readonly diagramFullscreenOpen = signal(false);
  protected readonly diagramScale = signal(1);
  protected readonly diagramDraftScale = signal(1);
  protected readonly diagramDragging = signal(false);
  private selectionOrigin: 'inventory' | 'diagram' | 'relation' | null = null;
  private lastQuerySignature = '';
  private dragPanState:
    | {
        pointerId: number;
        startX: number;
        startY: number;
        startScrollLeft: number;
        startScrollTop: number;
        moved: boolean;
      }
    | null = null;
  private suppressDiagramClick = false;

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const state = parseDeveloperTablesQueryState(params, {
        knownFeatures: this.knownFeatures,
        knownDomains: this.knownDomains,
        knownTableIds: this.knownTableIds,
      });

      this.searchQuery.set(state.search);
      this.selectedFeature.set(state.feature);
      this.selectedDomain.set(state.domain);
      this.selectedTableId.set(state.tableId);
      this.lastQuerySignature = JSON.stringify(buildDeveloperTablesQueryParams(state));
    });

    effect(() => {
      const schemas = this.filteredSchemas();
      const selectedTableId = this.selectedTableId();

      if (schemas.length === 0) {
        return;
      }

      if (!schemas.some((schema) => schema.id === selectedTableId)) {
        this.selectedTableId.set(schemas[0].id);
      }
    });

    effect(() => {
      if (!this.diagramRequested()) {
        return;
      }

      void this.renderMermaidDiagram(this.mermaidSource(), this.sortedSchemas().length);
    });

    effect(() => {
      const schemaId = this.selectedSchemaId();
      this.fieldSearchQuery.set('');

      if (!schemaId || !this.selectionOrigin) {
        return;
      }

      queueMicrotask(() => {
        this.syncSelectionFocus();
        this.selectionOrigin = null;
      });
    });

    effect(() => {
      const state: DeveloperTablesQueryState = {
        search: this.searchQuery().trim(),
        feature: this.selectedFeature(),
        domain: this.selectedDomain(),
        tableId: this.selectedTableId(),
      };
      const queryParams = buildDeveloperTablesQueryParams(state);
      const signature = JSON.stringify(queryParams);

      if (signature === this.lastQuerySignature) {
        return;
      }

      this.lastQuerySignature = signature;
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams,
        queryParamsHandling: '',
        replaceUrl: true,
      });
    });
  }

  protected readonly featureOptions = computed<SelectOption[]>(() => [
    {
      label: this.transloco.translate('developer.tables.filters.allFeatures'),
      value: '',
    },
    ...Array.from(new Set(this.schemas.map((schema) => schema.feature)))
      .sort((left, right) => left.localeCompare(right))
      .map((feature) => ({
        label: feature,
        value: feature,
      })),
  ]);

  protected readonly domainOptions = computed<SelectOption[]>(() => [
    {
      label: this.transloco.translate('developer.tables.filters.allDomains'),
      value: '',
    },
    ...Array.from(new Set(this.schemas.map((schema) => schema.domain)))
      .sort((left, right) => left.localeCompare(right))
      .map((domain) => ({
        label: domain,
        value: domain,
      })),
  ]);
  protected readonly featureSummaries = computed(() =>
    Array.from(new Set(this.schemas.map((schema) => schema.feature)))
      .sort((left, right) => left.localeCompare(right))
      .map((feature) => ({
        key: feature,
        label: feature,
        description: describeFeature(feature),
      })),
  );
  protected readonly domainSummaries = computed(() =>
    Array.from(new Set(this.schemas.map((schema) => schema.domain)))
      .sort((left, right) => left.localeCompare(right))
      .map((domain) => ({
        key: domain,
        label: domain,
        description: describeDomain(domain),
      })),
  );

  protected readonly filteredSchemas = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const feature = this.selectedFeature();
    const domain = this.selectedDomain();

    return this.schemas.filter((schema) => {
        if (feature && schema.feature !== feature) {
          return false;
        }

        if (domain && schema.domain !== domain) {
          return false;
        }

        if (!query) {
          return true;
        }

        const searchableParts = [
          schema.name,
          schema.feature,
          schema.domain,
          schema.description,
          ...schema.fields.flatMap((field) => [field.name, field.type, field.reference ?? '', field.description]),
          ...schema.relations.map((relation) => relation.label),
        ];

        return searchableParts.some((part) => part.toLowerCase().includes(query));
      });
  });
  protected readonly sortedSchemas = computed(() => {
    const sort = this.summarySort();
    const schemas = [...this.filteredSchemas()];

    if (!sort) {
      return schemas.sort((left, right) => left.name.localeCompare(right.name));
    }

    const direction = sort.direction === 'asc' ? 1 : -1;
    return schemas.sort((left, right) => compareSchemas(left, right, sort.key) * direction);
  });

  protected readonly mermaidSource = computed(() => buildMermaidDiagram(this.sortedSchemas(), this.selectedSchemaId()));
  protected readonly diagramNodeMap = computed(
    () => new Map(this.sortedSchemas().map((schema) => [toMermaidNodeId(schema.id), schema.id])),
  );
  protected readonly overviewStats = computed(() => {
    const schemas = this.sortedSchemas();

    return [
      {
        label: this.transloco.translate('developer.tables.overview.tables'),
        value: String(schemas.length),
      },
      {
        label: this.transloco.translate('developer.tables.overview.features'),
        value: String(new Set(schemas.map((schema) => schema.feature)).size),
      },
      {
        label: this.transloco.translate('developer.tables.overview.domains'),
        value: String(new Set(schemas.map((schema) => schema.domain)).size),
      },
    ];
  });

  protected readonly summaryColumns = computed<TableColumn[]>(() => [
    { key: 'name', header: this.transloco.translate('developer.tables.summary.columns.name'), sortable: true },
    { key: 'feature', header: this.transloco.translate('developer.tables.summary.columns.feature'), sortable: true },
    { key: 'domain', header: this.transloco.translate('developer.tables.summary.columns.domain'), sortable: true },
    { key: 'fields', header: this.transloco.translate('developer.tables.summary.columns.fields'), align: 'right', sortable: true },
    { key: 'relations', header: this.transloco.translate('developer.tables.summary.columns.relations'), align: 'right', sortable: true },
  ]);

  protected readonly summaryRows = computed<TableRow[]>(() =>
    this.sortedSchemas().map((schema) => ({
      id: schema.id,
      name: schema.name,
      feature: schema.feature,
      domain: schema.domain,
      fields: schema.fields.length,
      relations: schema.relations.length,
    })),
  );
  protected readonly activeFilterChips = computed(() => {
    const chips: Array<{ id: 'search' | 'feature' | 'domain'; label: string; value: string }> = [];
    const query = this.searchQuery().trim();
    const feature = this.selectedFeature();
    const domain = this.selectedDomain();

    if (query) {
      chips.push({ id: 'search', label: this.transloco.translate('developer.tables.filters.searchLabel'), value: query });
    }

    if (feature) {
      chips.push({ id: 'feature', label: this.transloco.translate('developer.tables.filters.featureLabel'), value: feature });
    }

    if (domain) {
      chips.push({ id: 'domain', label: this.transloco.translate('developer.tables.filters.domainLabel'), value: domain });
    }

    return chips;
  });
  protected readonly summaryResultsLabel = computed(() =>
    this.transloco.translate('developer.tables.summary.results', { count: this.sortedSchemas().length }),
  );
  protected readonly diagramZoomLabel = computed(() =>
    this.transloco.translate('developer.tables.diagram.zoomLabel', {
      percent: Math.round(this.diagramDraftScale() * 100),
    }),
  );
  protected readonly hasActiveFilters = computed(() => this.activeFilterChips().length > 0);
  protected readonly summaryEmptyDescription = computed(() =>
    this.hasActiveFilters()
      ? this.transloco.translate('developer.tables.summary.emptyFilteredDescription')
      : this.transloco.translate('developer.tables.summary.emptyDescription'),
  );
  protected readonly detailEmptyDescription = computed(() =>
    this.hasActiveFilters()
      ? this.transloco.translate('developer.tables.detail.noSelectionFiltered')
      : this.transloco.translate('developer.tables.detail.noSelection'),
  );

  protected readonly selectedSchema = computed(
    () => this.sortedSchemas().find((schema) => schema.id === this.selectedTableId()) ?? this.sortedSchemas()[0],
  );

  protected readonly selectedSchemaId = computed(() => this.selectedSchema()?.id ?? '');
  protected readonly selectedSchemaMeta = computed(() => {
    const schema = this.selectedSchema();

    if (!schema) {
      return null;
    }

    return this.transloco.translate('developer.tables.detail.meta', {
      fields: schema.fields.length,
      relations: schema.relations.length,
    });
  });
  protected readonly detailStats = computed(() => {
    const schema = this.selectedSchema();

    if (!schema) {
      return [];
    }

    return [
      {
        label: this.transloco.translate('developer.tables.detail.stats.fields'),
        value: String(schema.fields.length),
      },
      {
        label: this.transloco.translate('developer.tables.detail.stats.relations'),
        value: String(schema.relations.length),
      },
      {
        label: this.transloco.translate('developer.tables.detail.stats.foreignKeys'),
        value: String(schema.fields.filter((field) => Boolean(field.reference)).length),
      },
      {
        label: this.transloco.translate('developer.tables.detail.stats.nullable'),
        value: String(schema.fields.filter((field) => field.nullable).length),
      },
    ];
  });
  protected readonly tableSize = computed(() => (this.compactMode() ? 'sm' : 'md'));

  protected readonly fieldColumns = computed<TableColumn[]>(() => [
    { key: 'name', header: this.transloco.translate('developer.tables.detail.columns.name') },
    { key: 'role', header: this.transloco.translate('developer.tables.detail.columns.role') },
    { key: 'type', header: this.transloco.translate('developer.tables.detail.columns.type') },
    { key: 'nullable', header: this.transloco.translate('developer.tables.detail.columns.nullable') },
    { key: 'reference', header: this.transloco.translate('developer.tables.detail.columns.reference') },
    { key: 'description', header: this.transloco.translate('developer.tables.detail.columns.description') },
  ]);

  protected readonly fieldRows = computed<TableRow[]>(() => {
    const schema = this.selectedSchema();
    const query = this.fieldSearchQuery().trim().toLowerCase();

    if (!schema) {
      return [];
    }

    return schema.fields
      .filter((field) => {
        if (!query) {
          return true;
        }

        return [field.name, field.type, field.reference ?? '', field.description].some((part) =>
          part.toLowerCase().includes(query),
        );
      })
      .map((field) => ({
        id: `${schema.id}.${field.name}`,
        name: field.name,
        role: buildFieldRoleBadge(field, this.transloco),
        type: buildTypeBadge(field.type),
        nullable: field.nullable
          ? this.transloco.translate('developer.tables.detail.yes')
          : this.transloco.translate('developer.tables.detail.no'),
        reference: field.reference ?? this.transloco.translate('developer.tables.detail.none'),
        description: field.description,
      }));
  });

  protected readonly fieldEmptyDescription = computed(() => {
    const schema = this.selectedSchema();

    if (!schema) {
      return this.transloco.translate('developer.tables.detail.emptyDescription');
    }

    if (schema.fields.length === 0) {
      return this.transloco.translate('developer.tables.detail.emptyDescription');
    }

    if (this.fieldSearchQuery().trim()) {
      return this.transloco.translate('developer.tables.detail.emptySearchDescription');
    }

    return this.transloco.translate('developer.tables.detail.emptyDescription');
  });

  protected readonly relationGroups = computed(() => {
    const relations =
      this.selectedSchema()?.relations.map((relation) => ({
        ...relation,
        targetTableId: extractTargetTableId(relation.target),
      })) ?? [];

    const groups = new Map<
      string,
      {
        targetTableId: string;
        targetTableName: string;
        count: number;
        relations: typeof relations;
      }
    >();

    for (const relation of relations) {
      const existing = groups.get(relation.targetTableId);
      const targetTableName = this.schemas.find((schema) => schema.id === relation.targetTableId)?.name ?? relation.targetTableId;

      if (existing) {
        existing.relations.push(relation);
        existing.count += 1;
        continue;
      }

      groups.set(relation.targetTableId, {
        targetTableId: relation.targetTableId,
        targetTableName,
        count: 1,
        relations: [relation],
      });
    }

    return Array.from(groups.values()).sort((left, right) => left.targetTableName.localeCompare(right.targetTableName));
  });

  protected selectSchema(row: TableRow): void {
    const id = row['id'];
    if (typeof id === 'string') {
      this.selectionOrigin = 'inventory';
      this.selectedTableId.set(id);
    }
  }

  protected navigateToRelation(targetTableId: string): void {
    const existsInFilteredSchemas = this.sortedSchemas().some((schema) => schema.id === targetTableId);

    if (!existsInFilteredSchemas) {
      this.clearFilters();
    }

    this.selectionOrigin = 'relation';
    this.selectedTableId.set(targetTableId);
  }

  protected clearFilters(): void {
    this.searchQuery.set('');
    this.selectedFeature.set('');
    this.selectedDomain.set('');
  }

  protected clearFieldSearch(): void {
    this.fieldSearchQuery.set('');
  }

  protected clearFilterChip(filterId: 'search' | 'feature' | 'domain'): void {
    if (filterId === 'search') {
      this.searchQuery.set('');
      return;
    }

    if (filterId === 'feature') {
      this.selectedFeature.set('');
      return;
    }

    this.selectedDomain.set('');
  }

  protected toggleFilters(): void {
    this.filtersExpanded.update((value) => !value);
  }

  protected toggleCompactMode(): void {
    this.compactMode.update((value) => !value);
  }

  protected requestDiagramRender(): void {
    this.diagramRequested.set(true);
  }

  protected openMermaidSource(): void {
    this.mermaidSourceOpen.set(true);
  }

  protected closeMermaidSource(): void {
    this.mermaidSourceOpen.set(false);
  }

  protected openFiltersInfo(): void {
    this.filtersInfoOpen.set(true);
  }

  protected closeFiltersInfo(): void {
    this.filtersInfoOpen.set(false);
  }

  protected openDiagramFullscreen(): void {
    if (!this.diagramRequested()) {
      this.requestDiagramRender();
    }

    this.diagramDraftScale.set(this.diagramScale());
    this.diagramFullscreenOpen.set(true);
  }

  protected closeDiagramFullscreen(): void {
    this.diagramDraftScale.set(this.diagramScale());
    this.diagramFullscreenOpen.set(false);
  }

  protected applyDiagramFullscreen(): void {
    this.diagramScale.set(this.diagramDraftScale());
    this.diagramFullscreenOpen.set(false);
  }

  protected hideDiagramRender(): void {
    this.diagramRequested.set(false);
    this.diagramSvg.set(null);
    this.diagramError.set('');
  }

  protected zoomDiagramIn(): void {
    this.diagramDraftScale.update((value) => clampDiagramScale(value + 0.2));
  }

  protected zoomDiagramOut(): void {
    this.diagramDraftScale.update((value) => clampDiagramScale(value - 0.2));
  }

  protected resetDiagramZoom(): void {
    this.diagramDraftScale.set(1);
  }

  protected startDiagramPan(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    const target = event.target;
    if (target instanceof Element && target.closest('a, button')) {
      return;
    }

    const container = event.currentTarget;
    if (!(container instanceof HTMLElement)) {
      return;
    }

    this.dragPanState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: container.scrollLeft,
      startScrollTop: container.scrollTop,
      moved: false,
    };
    this.diagramDragging.set(true);
    this.suppressDiagramClick = false;
    container.setPointerCapture?.(event.pointerId);
  }

  protected moveDiagramPan(event: PointerEvent): void {
    const state = this.dragPanState;
    const container = event.currentTarget;
    if (!state || !(container instanceof HTMLElement) || event.pointerId !== state.pointerId) {
      return;
    }

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      state.moved = true;
      this.suppressDiagramClick = true;
    }

    container.scrollLeft = state.startScrollLeft - deltaX;
    container.scrollTop = state.startScrollTop - deltaY;
  }

  protected endDiagramPan(event: PointerEvent | MouseEvent): void {
    const container = event.currentTarget;
    const pointerId = 'pointerId' in event ? event.pointerId : null;

    if (container instanceof HTMLElement && this.dragPanState && pointerId === this.dragPanState.pointerId) {
      container.releasePointerCapture?.(pointerId);
    }

    this.dragPanState = null;
    this.diagramDragging.set(false);
  }

  protected selectSchemaFromDiagram(event: MouseEvent): void {
    if (this.suppressDiagramClick) {
      this.suppressDiagramClick = false;
      event.preventDefault();
      return;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const diagramLink = target.closest('a');
    const linkTarget = diagramLink?.getAttribute('href') ?? diagramLink?.getAttribute('xlink:href');
    const linkedSchemaId = linkTarget?.startsWith('#schema-') ? linkTarget.replace('#schema-', '') : null;

    if (linkedSchemaId) {
      event.preventDefault();
      this.selectionOrigin = 'diagram';
      this.selectedTableId.set(linkedSchemaId);
      return;
    }

    const diagramNode = target.closest<SVGGElement>('g[id]');
    const schemaId = diagramNode ? this.diagramNodeMap().get(diagramNode.id) : null;

    if (schemaId) {
      this.selectionOrigin = 'diagram';
      this.selectedTableId.set(schemaId);
    }
  }

  private async renderMermaidDiagram(source: string, schemaCount: number): Promise<void> {
    const currentRender = ++this.renderSequence;

    if (schemaCount === 0) {
      this.diagramSvg.set(null);
      this.diagramError.set('');
      return;
    }

    try {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'neutral',
      });

      const { svg } = await mermaid.render(`developer-tables-diagram-${currentRender}`, source);

      if (currentRender !== this.renderSequence) {
        return;
      }

      this.diagramSvg.set(this.sanitizer.bypassSecurityTrustHtml(svg));
      this.diagramError.set('');
    } catch {
      if (currentRender !== this.renderSequence) {
        return;
      }

      this.diagramSvg.set(null);
      this.diagramError.set(this.transloco.translate('developer.tables.diagram.renderError'));
    }
  }

  private syncSelectionFocus(): void {
    const detail = document.getElementById('developer-table-detail');
    const activeRow = document.querySelector<HTMLElement>(`tr[data-row-id="${this.selectedSchemaId()}"]`);
    const activeNode = document.querySelector<HTMLElement>(`#${toMermaidNodeId(this.selectedSchemaId())}`);

    activeRow?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    activeNode?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });

    if (window.innerWidth <= 900) {
      detail?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  }
}

function compareSchemas(
  left: { name: string; feature: string; domain: string; fields: unknown[]; relations: unknown[] },
  right: { name: string; feature: string; domain: string; fields: unknown[]; relations: unknown[] },
  key: string,
): number {
  if (key === 'fields') {
    return left.fields.length - right.fields.length || left.name.localeCompare(right.name);
  }

  if (key === 'relations') {
    return left.relations.length - right.relations.length || left.name.localeCompare(right.name);
  }

  if (key === 'feature') {
    return left.feature.localeCompare(right.feature) || left.name.localeCompare(right.name);
  }

  if (key === 'domain') {
    return left.domain.localeCompare(right.domain) || left.name.localeCompare(right.name);
  }

  return left.name.localeCompare(right.name);
}

function buildTypeBadge(type: string): TableBadgeCell {
  return {
    kind: 'badge',
    label: type,
    variant: 'neutral',
  };
}

function buildFieldRoleBadge(
  field: { primaryKey?: boolean; reference?: string | null },
  transloco: TranslocoService,
): TableBadgeCell {
  if (field.primaryKey) {
    return {
      kind: 'badge',
      label: transloco.translate('developer.tables.detail.roles.primaryKey'),
      variant: 'secondary',
    };
  }

  if (field.reference) {
    return {
      kind: 'badge',
      label: transloco.translate('developer.tables.detail.roles.foreignKey'),
      variant: 'primary',
    };
  }

  return {
    kind: 'badge',
    label: transloco.translate('developer.tables.detail.roles.attribute'),
    variant: 'violet',
  };
}

function buildMermaidDiagram(
  schemas: Array<{
    id: string;
    name: string;
    feature: string;
    domain: string;
    relations: Array<{ target: string }>;
  }>,
  selectedTableId: string,
): string {
  const visibleTableIds = new Set(schemas.map((schema) => schema.id));
  const nodes = schemas.map(
    (schema) =>
      `  ${toMermaidNodeId(schema.id)}["${schema.name}<br/>${schema.feature} · ${schema.domain}"]`,
  );
  const clicks = schemas.map((schema) => `  click ${toMermaidNodeId(schema.id)} href "#schema-${schema.id}" "${schema.name}"`);

  const edges = schemas.flatMap((schema) =>
    schema.relations
      .filter((relation) => visibleTableIds.has(relation.target.split('.')[0] ?? ''))
      .map((relation) => {
        const targetTableId = relation.target.split('.')[0] ?? '';
        return `  ${toMermaidNodeId(schema.id)} --> ${toMermaidNodeId(targetTableId)}`;
      }),
  );

  const selectedStyle = selectedTableId
    ? [`  classDef selected fill:#dbeafe,stroke:#2563eb,stroke-width:2px;`, `  class ${toMermaidNodeId(selectedTableId)} selected;`]
    : [];

  return ['flowchart LR', ...nodes, ...clicks, ...Array.from(new Set(edges)), ...selectedStyle].join('\n');
}

function toMermaidNodeId(value: string): string {
  return `table_${value.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

function extractTargetTableId(value: string): string {
  return value.split('.')[0] ?? value;
}

function clampDiagramScale(value: number): number {
  return Math.max(0.6, Math.min(2.2, Number(value.toFixed(2))));
}

function describeFeature(feature: string): string {
  switch (feature) {
    case 'auth':
      return 'Permisos, roles, sesiones y piezas necesarias para autenticacion y control de acceso.';
    case 'catalog':
      return 'Carta, productos, modificadores, combos y reglas que definen la oferta comercial.';
    case 'developer':
      return 'Herramientas tecnicas, auditoria y eventos internos pensados para soporte y observabilidad.';
    case 'orders':
      return 'Pedidos, pagos y estados del servicio que mueven la operativa de venta.';
    case 'platform':
      return 'Entidades base compartidas por varias areas, como organizacion, clientes o tiempo.';
    case 'restaurants':
      return 'Configuracion operativa del restaurante, reservas, sala y recursos fisicos.';
    case 'scheduling':
      return 'Turnos, fichajes y solicitudes de cambio relacionadas con la planificacion.';
    case 'users':
      return 'Cuentas de usuario y datos principales de las personas que acceden al sistema.';
    default:
      return 'Conjunto funcional usado para agrupar tablas relacionadas dentro del producto.';
  }
}

function describeDomain(domain: string): string {
  switch (domain) {
    case 'catalog':
      return 'Modelo de datos de la carta y de lo que el cliente puede pedir o personalizar.';
    case 'core':
      return 'Base transversal del sistema con entidades comunes reutilizadas por varias features.';
    case 'identity':
      return 'Identidad, acceso y autorizacion de usuarios dentro de la plataforma.';
    case 'operations':
      return 'Operacion interna del restaurante: espacios, recursos fisicos y trabajo diario.';
    case 'platform':
      return 'Infraestructura tecnica y mecanismos internos de soporte del producto.';
    case 'service':
      return 'Flujo de servicio al cliente: reservas, pedidos, cobros y estados de atencion.';
    default:
      return 'Agrupacion conceptual usada para entender el area del negocio o del sistema.';
  }
}

type DeveloperTablesQueryState = {
  search: string;
  feature: string;
  domain: string;
  tableId: string;
};

function parseDeveloperTablesQueryState(
  params: { get(name: string): string | null },
  options: {
    knownFeatures: Set<string>;
    knownDomains: Set<string>;
    knownTableIds: Set<string>;
  },
): DeveloperTablesQueryState {
  const search = params.get('q')?.trim() ?? '';
  const feature = params.get('feature') ?? '';
  const domain = params.get('domain') ?? '';
  const tableId = params.get('table') ?? '';

  return {
    search,
    feature: options.knownFeatures.has(feature) ? feature : '',
    domain: options.knownDomains.has(domain) ? domain : '',
    tableId: options.knownTableIds.has(tableId) ? tableId : '',
  };
}

function buildDeveloperTablesQueryParams(state: DeveloperTablesQueryState): Record<string, string | null> {
  return {
    q: state.search || null,
    feature: state.feature || null,
    domain: state.domain || null,
    table: state.tableId || null,
  };
}
