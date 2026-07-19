import { computed, Injectable, signal } from '@angular/core';

import type {
  AddFloorElementInput,
  EditableFloorElementType,
  FloorElement,
  RestaurantTable,
  ServicePoint,
  TableShape,
  TableStatus,
} from '../models/restaurant-pos.models';
export type RestaurantFloorLoadStatus = 'loading' | 'loaded' | 'error';

@Injectable({ providedIn: 'root' })
export class RestaurantFloorStore {
  private readonly _gridRows = signal(1);
  private readonly _gridColumns = signal(1);
  private readonly _activeFloorId = signal<string | null>(null);
  private readonly _activeFloorName = signal('');
  private readonly _floorElements = signal<FloorElement[]>([]);
  private readonly _restaurantTables = signal<RestaurantTable[]>([]);
  private readonly _floorLoadStatus = signal<RestaurantFloorLoadStatus>('loading');
  private readonly _floorLoadError = signal<string | null>(null);
  private readonly _floorContextEpoch = signal(0);

  readonly gridRows = this._gridRows.asReadonly();
  readonly gridColumns = this._gridColumns.asReadonly();
  readonly activeFloorId = this._activeFloorId.asReadonly();
  readonly activeFloorName = this._activeFloorName.asReadonly();
  readonly floorElements = this._floorElements.asReadonly();
  readonly restaurantTables = this._restaurantTables.asReadonly();
  readonly floorLoadStatus = this._floorLoadStatus.asReadonly();
  readonly floorLoadError = this._floorLoadError.asReadonly();
  readonly floorContextEpoch = this._floorContextEpoch.asReadonly();
  readonly servicePoints = computed<ServicePoint[]>(() =>
    this._floorElements()
      .filter((el) => !!el.tableId && (el.type === 'table' || el.type === 'stool'))
      .map((el) => {
        const table = this._restaurantTables().find((t) => t.id === el.tableId);
        return table ? { element: el, table } : null;
      })
      .filter((sp): sp is ServicePoint => sp !== null),
  );

  hydrateLayout(input: {
    floorId?: string | null;
    floorName?: string;
    rows: number;
    columns: number;
    floorElements: FloorElement[];
    restaurantTables: RestaurantTable[];
  }): void {
    this._activeFloorId.set(input.floorId ?? null);
    this._activeFloorName.set(input.floorName ?? 'Sala principal');
    this._gridRows.set(input.rows);
    this._gridColumns.set(input.columns);
    this._floorElements.set(structuredClone(input.floorElements));
    this._restaurantTables.set(structuredClone(input.restaurantTables));
    this._floorLoadError.set(null);
    this._floorLoadStatus.set('loaded');
  }

  beginFloorLoad(): void {
    this._floorContextEpoch.update((epoch) => epoch + 1);
    this._activeFloorId.set(null);
    this._activeFloorName.set('');
    this._gridRows.set(1);
    this._gridColumns.set(1);
    this._floorElements.set([]);
    this._restaurantTables.set([]);
    this._floorLoadError.set(null);
    this._floorLoadStatus.set('loading');
  }

  completeEmptyFloorLoad(): void {
    this._floorContextEpoch.update((epoch) => epoch + 1);
    this._activeFloorId.set(null);
    this._activeFloorName.set('');
    this._gridRows.set(1);
    this._gridColumns.set(1);
    this._floorElements.set([]);
    this._restaurantTables.set([]);
    this._floorLoadError.set(null);
    this._floorLoadStatus.set('loaded');
  }

  failFloorLoad(message: string): void {
    this._floorLoadError.set(message);
    this._floorLoadStatus.set('error');
  }

  hydrateServicePoint(input: { table: RestaurantTable; floorElement?: FloorElement | null }): void {
    this._restaurantTables.update((tables) => this.replaceOrAppendTable(tables, input.table));
    if (input.floorElement) {
      this._floorElements.update((els) => this.replaceOrAppendFloorElement(els, input.floorElement!));
    }
  }

  addRow(): void {
    this._gridRows.update((r) => r + 1);
  }

  addColumn(): void {
    this._gridColumns.update((c) => c + 1);
  }

  removeRow(): boolean {
    const next = this._gridRows() - 1;
    if (next < 1 || this.hasElementsOutsideBounds(next, this._gridColumns())) return false;
    this._gridRows.set(next);
    return true;
  }

  removeColumn(): boolean {
    const next = this._gridColumns() - 1;
    if (next < 1 || this.hasElementsOutsideBounds(this._gridRows(), next)) return false;
    this._gridColumns.set(next);
    return true;
  }

  setGridSize(rows: number, columns: number): boolean {
    if (rows < 1 || columns < 1 || this.hasElementsOutsideBounds(rows, columns)) return false;
    this._gridRows.set(rows);
    this._gridColumns.set(columns);
    return true;
  }

  addFloorElement(input: AddFloorElementInput): boolean {
    if (!this.canPlaceElement(input)) return false;
    const elementId = this.createFloorElementId();
    const tableId =
      input.type === 'table' || input.type === 'stool' ? (input.tableId ?? this.createTableId()) : input.tableId;
    const element: FloorElement = { ...input, id: elementId, ...(tableId ? { tableId } : {}) };
    this._floorElements.update((els) => [...els, element]);
    if ((input.type === 'table' || input.type === 'stool') && tableId && !this.getTable(tableId)) {
      this.createRestaurantTable(tableId, input.type === 'stool' ? 1 : 4);
    }
    return true;
  }

  deleteFloorElement(elementId: string): string | null {
    const element = this._floorElements().find((el) => el.id === elementId);
    this._floorElements.update((els) => els.filter((el) => el.id !== elementId));
    if (element?.tableId) {
      const tableId = element.tableId;
      this._restaurantTables.update((tables) => tables.filter((t) => t.id !== tableId));
      return tableId;
    }
    return null;
  }

  renameFloorElement(elementId: string, label: string): boolean {
    const normalized = label.trim();
    if (!normalized) return false;
    this._floorElements.update((els) =>
      els.map((el) => (el.id === elementId ? { ...el, label: normalized } : el)),
    );
    return true;
  }

  resizeFloorElement(elementId: string, width: number, height: number): boolean {
    const element = this._floorElements().find((el) => el.id === elementId);
    if (!element) return false;
    const next = { ...element, width, height };
    if (!this.canPlaceElement(next, elementId)) return false;
    this._floorElements.update((els) => els.map((el) => (el.id === elementId ? next : el)));
    return true;
  }

  updateFloorElementDetails(
    elementId: string,
    patch: Pick<FloorElement, 'label' | 'type' | 'width' | 'height'> & { shape?: TableShape },
  ): boolean {
    const element = this._floorElements().find((el) => el.id === elementId);
    if (!element) return false;
    const normalized = patch.label.trim();
    if (!normalized) return false;
    const next: FloorElement = {
      ...element,
      ...patch,
      label: normalized,
      ...(patch.type === 'table' && patch.shape ? { shape: patch.shape } : { shape: undefined }),
    };
    if (!this.canPlaceElement(next, elementId)) return false;
    this._floorElements.update((els) => els.map((el) => (el.id === elementId ? next : el)));
    return true;
  }

  moveFloorElement(elementId: string, x: number, y: number): boolean {
    const element = this._floorElements().find((el) => el.id === elementId);
    if (!element) return false;
    const next = { ...element, x, y };
    if (!this.canPlaceElement(next, elementId)) return false;
    this._floorElements.update((els) => els.map((el) => (el.id === elementId ? next : el)));
    return true;
  }

  updateTableCapacityForElement(elementId: string, capacity: number): void {
    const element = this._floorElements().find((el) => el.id === elementId);
    if (!element?.tableId || capacity < 1) return;
    this._restaurantTables.update((tables) =>
      tables.map((t) => (t.id === element.tableId ? { ...t, capacity: Math.floor(capacity) } : t)),
    );
  }

  updateTable(tableId: string, patch: Partial<RestaurantTable>): void {
    this._restaurantTables.update((tables) =>
      tables.map((t) => (t.id === tableId ? { ...t, ...patch } : t)),
    );
  }

  updateTableStatus(tableId: string, status: TableStatus): void {
    this.updateTable(tableId, { status });
  }

  createRestaurantTable(tableId: string, capacity = 4): void {
    const nextNumber = this.getNextTableNumber();
    const table: RestaurantTable = {
      id: tableId,
      number: nextNumber,
      capacity,
      status: 'free',
      total: 0,
      openDuration: '12m',
    };
    this._restaurantTables.update((tables) => [...tables, table]);
  }

  canPlaceElement(input: AddFloorElementInput, ignoredElementId?: string): boolean {
    if (input.x < 0 || input.y < 0 || input.width < 1 || input.height < 1) return false;
    if (input.x + input.width > this._gridColumns() || input.y + input.height > this._gridRows()) return false;
    return !this._floorElements().some((el) => el.id !== ignoredElementId && this.overlaps(el, input));
  }

  nextFloorElementSortOrder(): number {
    return this._floorElements().length + 1;
  }

  getNextTableNumber(): number {
    return Math.max(0, ...this._restaurantTables().map((t) => t.number)) + 1;
  }

  findAvailablePlacement(width: number, height: number): Pick<FloorElement, 'x' | 'y'> | null {
    if (width < 1 || height < 1 || width > this._gridColumns() || height > this._gridRows()) return null;
    for (let y = 0; y <= this._gridRows() - height; y += 1) {
      for (let x = 0; x <= this._gridColumns() - width; x += 1) {
        const candidate: AddFloorElementInput = { type: 'table', label: 'Table', x, y, width, height };
        if (this.canPlaceElement(candidate)) return { x, y };
      }
    }
    return null;
  }

  getTable(tableId: string): RestaurantTable | undefined {
    return this._restaurantTables().find((t) => t.id === tableId);
  }

  private replaceOrAppendTable(tables: RestaurantTable[], next: RestaurantTable): RestaurantTable[] {
    return tables.some((t) => t.id === next.id)
      ? tables.map((t) => (t.id === next.id ? structuredClone(next) : t))
      : [...tables, structuredClone(next)];
  }

  private replaceOrAppendFloorElement(els: FloorElement[], next: FloorElement): FloorElement[] {
    return els.some((el) => el.id === next.id)
      ? els.map((el) => (el.id === next.id ? structuredClone(next) : el))
      : [...els, structuredClone(next)];
  }

  private hasElementsOutsideBounds(rows: number, columns: number): boolean {
    return this._floorElements().some((el) => el.x + el.width > columns || el.y + el.height > rows);
  }

  private overlaps(a: Pick<FloorElement, 'x' | 'y' | 'width' | 'height'>, b: AddFloorElementInput): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private createFloorElementId(): string {
    return `floor-element-${this._floorElements().length + 1}`;
  }

  private createTableId(): string {
    return `table-${this.getNextTableNumber()}`;
  }
}
