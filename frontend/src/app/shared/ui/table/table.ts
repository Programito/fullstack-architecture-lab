import { booleanAttribute, Component, computed, input, model, numberAttribute, output } from '@angular/core';
import { Badge, type BadgeVariant } from '../badge/badge';
import { EmptyState } from '../empty-state/empty-state';
import { Icon } from '../icon/icon';
import { Paginator } from '../paginator/paginator';

export type TableSize = 'sm' | 'md' | 'lg';
export type TableVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type TableAppearance = 'default' | 'minimal';
export type TableAlign = 'left' | 'center' | 'right';
export type TableRow = Record<string, unknown>;

export type TableColumn = {
  key: string;
  header: string;
  align?: TableAlign;
  width?: string;
  sortable?: boolean;
};

export type TableAction = {
  label: string;
  ariaLabel?: string;
  value: string;
};

export type TableBadgeCell = {
  kind: 'badge';
  label: string;
  variant: BadgeVariant;
};

export type TableSort = {
  key: string;
  direction: 'asc' | 'desc';
};

@Component({
  selector: 'app-table',
  imports: [Badge, EmptyState, Icon, Paginator],
  templateUrl: './table.html',
  styleUrl: './table.css',
})
export class Table {
  readonly columns = input<TableColumn[]>([]);
  readonly rows = input<TableRow[]>([]);
  readonly rowId = input('id');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly emptyTitle = input('Sin datos');
  readonly emptyDescription = input('No hay filas para mostrar.');
  readonly selectable = input(false, { transform: booleanAttribute });
  readonly pagination = input(false, { transform: booleanAttribute });
  readonly page = input(1, { transform: normalizePositiveInteger });
  readonly totalItems = input(0, { transform: normalizeNonNegativeInteger });
  readonly pageSize = input(10, { transform: normalizePositiveInteger });
  readonly pageSizeOptions = input<number[]>([]);
  readonly size = input<TableSize>('md');
  readonly variant = input<TableVariant>('primary');
  readonly appearance = input<TableAppearance>('default');

  readonly selected = model<string[]>([]);
  readonly sort = model<TableSort | null>(null);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly rowSelected = output<TableRow>();
  readonly rowAction = output<{ action: string; row: TableRow }>();

  protected readonly hasRows = computed(() => this.rows().length > 0);
  protected readonly visibleRowIds = computed(() => this.rows().map((row, index) => this.rowKey(row, index)));
  protected readonly selectedSet = computed(() => new Set(this.selected()));
  protected readonly allVisibleSelected = computed(() => {
    const ids = this.visibleRowIds();
    return ids.length > 0 && ids.every((id) => this.selectedSet().has(id));
  });
  protected readonly someVisibleSelected = computed(() => {
    const ids = this.visibleRowIds();
    return ids.some((id) => this.selectedSet().has(id)) && !this.allVisibleSelected();
  });
  protected readonly columnCount = computed(() => this.columns().length + (this.selectable() ? 1 : 0));
  protected readonly showPaginator = computed(() => this.pagination() && this.totalItems() > 0);

  protected readonly classes = computed(() =>
    [
      'table',
      `table--${this.size()}`,
      `table--${this.variant()}`,
      `table--${this.appearance()}`,
      this.loading() ? 'table--loading' : '',
      this.selectable() ? 'table--selectable' : '',
    ].join(' '),
  );

  protected rowKey(row: TableRow, index: number): string {
    const value = row[this.rowId()];
    return value === undefined || value === null ? String(index) : String(value);
  }

  protected cellValue(row: TableRow, column: TableColumn): string {
    const value = row[column.key];

    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    return String(value);
  }

  protected isActionColumn(column: TableColumn): boolean {
    return column.key === 'actions';
  }

  protected isBadgeValue(value: unknown): value is TableBadgeCell {
    return typeof value === 'object' && value !== null && (value as { kind?: unknown }).kind === 'badge';
  }

  protected badgeValue(row: TableRow, column: TableColumn): TableBadgeCell | null {
    const value = row[column.key];
    return this.isBadgeValue(value) ? value : null;
  }

  protected rowActions(row: TableRow): TableAction[] {
    const actions = row['actions'];
    return Array.isArray(actions) ? (actions as TableAction[]) : [];
  }

  protected alignClass(column: TableColumn): string {
    return `table__cell--${column.align ?? 'left'}`;
  }

  protected headerCellClass(column: TableColumn): string {
    return ['table__header-cell', this.alignClass(column)].join(' ');
  }

  protected bodyCellClass(column: TableColumn): string {
    return ['table__cell', this.alignClass(column)].join(' ');
  }

  protected columnStyle(column: TableColumn): string | null {
    return column.width ? `width: ${column.width};` : null;
  }

  protected isSelected(row: TableRow, index: number): boolean {
    return this.selectedSet().has(this.rowKey(row, index));
  }

  protected toggleRow(row: TableRow, index: number, event?: Event): void {
    event?.stopPropagation();

    if (!this.selectable()) {
      return;
    }

    const id = this.rowKey(row, index);
    const next = new Set(this.selected());

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    this.selected.set(Array.from(next));
  }

  protected toggleAllVisible(): void {
    if (!this.selectable()) {
      return;
    }

    const visibleIds = this.visibleRowIds();
    const next = new Set(this.selected());

    if (this.allVisibleSelected()) {
      visibleIds.forEach((id) => next.delete(id));
    } else {
      visibleIds.forEach((id) => next.add(id));
    }

    this.selected.set(Array.from(next));
  }

  protected selectRow(row: TableRow): void {
    this.rowSelected.emit(row);
  }

  protected triggerRowAction(action: TableAction, row: TableRow, event: Event): void {
    event.stopPropagation();
    this.rowAction.emit({ action: action.value, row });
  }

  protected toggleSort(column: TableColumn): void {
    if (!column.sortable) {
      return;
    }

    const current = this.sort();

    if (current?.key !== column.key) {
      this.sort.set({ key: column.key, direction: 'asc' });
      return;
    }

    if (current.direction === 'asc') {
      this.sort.set({ key: column.key, direction: 'desc' });
      return;
    }

    this.sort.set(null);
  }

  protected sortIcon(column: TableColumn): string {
    const current = this.sort();

    if (current?.key !== column.key) {
      return 'unfold_more';
    }

    return current.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  protected ariaSort(column: TableColumn): 'ascending' | 'descending' | null {
    const current = this.sort();

    if (current?.key !== column.key) {
      return null;
    }

    return current.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected sortLabel(column: TableColumn): string {
    const current = this.sort();

    if (current?.key !== column.key) {
      return `Ordenar por ${column.header}`;
    }

    return current.direction === 'asc' ? `Ordenar ${column.header} descendente` : `Quitar orden de ${column.header}`;
  }

  protected handlePageChange(page: number): void {
    this.pageChange.emit(page);
  }

  protected handlePageSizeChange(pageSize: number): void {
    this.pageSizeChange.emit(pageSize);
  }
}

const normalizePositiveInteger = (value: unknown): number => {
  const number = numberAttribute(value);
  return Number.isInteger(number) && number > 0 ? number : 1;
};

const normalizeNonNegativeInteger = (value: unknown): number => {
  const number = numberAttribute(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
};
