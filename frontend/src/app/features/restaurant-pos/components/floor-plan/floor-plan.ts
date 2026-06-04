import { NgClass, NgStyle } from '@angular/common';
import { CdkDrag, CdkDragHandle, type CdkDragEnd } from '@angular/cdk/drag-drop';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { FloorElement, TableShape } from '../../models/restaurant-pos.models';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { TableVisual } from '../table-visual/table-visual';

const GRID_CELL_SIZE = '5.5rem';

@Component({
  selector: 'app-floor-plan',
  imports: [CdkDrag, CdkDragHandle, Icon, NgClass, NgStyle, TableVisual],
  templateUrl: './floor-plan.html',
})
export class FloorPlan {
  readonly layoutMode = input(true);
  readonly editElement = output<FloorElement>();
  readonly resizeElement = output<FloorElement>();

  protected readonly store = inject(RestaurantPosStore);
  protected readonly selectedElementId = signal<string | null>(null);
  protected readonly cells = computed(() =>
    Array.from({ length: this.store.gridRows() * this.store.gridColumns() }, (_, index) => ({
      x: index % this.store.gridColumns(),
      y: Math.floor(index / this.store.gridColumns()),
    })),
  );

  protected gridStyle(): Record<string, string> {
    return {
      'grid-template-columns': `repeat(${this.store.gridColumns()}, ${GRID_CELL_SIZE})`,
      'grid-template-rows': `repeat(${this.store.gridRows()}, ${GRID_CELL_SIZE})`,
    };
  }

  protected elementStyle(element: FloorElement): Record<string, string> {
    return {
      'grid-column': `${element.x + 1} / span ${element.width}`,
      'grid-row': `${element.y + 1} / span ${element.height}`,
    };
  }

  protected handleElementClick(element: FloorElement): void {
    if (this.layoutMode()) {
      this.selectedElementId.set(element.id);
      return;
    }

    if (element.tableId) {
      this.store.selectTable(element.tableId);
    }
  }

  protected requestEdit(element: FloorElement, event: Event): void {
    event.stopPropagation();
    this.editElement.emit(element);
  }

  protected requestResize(element: FloorElement, event: Event): void {
    event.stopPropagation();
    this.resizeElement.emit(element);
  }

  protected deleteElement(element: FloorElement, event: Event): void {
    event.stopPropagation();

    if (confirm('Delete this element from the layout?')) {
      this.store.deleteFloorElement(element.id);
      this.selectedElementId.set(null);
    }
  }

  protected handleDragEnded(event: CdkDragEnd<HTMLElement>, element: FloorElement): void {
    if (!this.layoutMode()) {
      event.source.reset();
      return;
    }

    const gridElement = event.source.getRootElement().parentElement;
    const movement = gridElement ? this.getGridMovement(event.distance, gridElement) : { x: 0, y: 0 };
    event.source.reset();

    const nextPosition = this.clampElementPosition(element, element.x + movement.x, element.y + movement.y);

    if (nextPosition.x !== element.x || nextPosition.y !== element.y) {
      this.store.moveFloorElement(element.id, nextPosition.x, nextPosition.y);
    }
  }

  protected isSelected(element: FloorElement): boolean {
    return this.layoutMode() ? this.selectedElementId() === element.id : !!element.tableId && this.store.selectedTableId() === element.tableId;
  }

  protected displayLabel(element: FloorElement): string {
    if (!element.tableId) {
      return element.label;
    }

    const table = this.store.restaurantTables().find((restaurantTable) => restaurantTable.id === element.tableId);
    return element.label || (table ? `M${table.number}` : 'Table');
  }

  protected tableCapacity(element: FloorElement): string {
    const table = element.tableId ? this.store.restaurantTables().find((restaurantTable) => restaurantTable.id === element.tableId) : null;
    return `${table?.capacity ?? 4} pax`;
  }

  protected elementClass(element: FloorElement): string {
    return [
      'group relative z-10 grid min-h-20 place-items-center rounded-md border border-stone-300 bg-white/20 p-1 text-center transition focus:outline-none',
      this.layoutMode() ? 'cursor-pointer hover:border-cyan-300 hover:bg-white/35' : '',
      this.isSelected(element) ? 'z-40 border-cyan-400 ring-2 ring-cyan-500 ring-offset-2 ring-offset-stone-100' : '',
    ].join(' ');
  }

  protected elementAriaLabel(element: FloorElement): string {
    return `${this.displayLabel(element)} floor element`;
  }

  protected tableShape(element: FloorElement): TableShape {
    return element.shape ?? 'rectangle';
  }

  protected zoneObjectLabel(element: FloorElement): string {
    return `${this.displayLabel(element)} object`;
  }

  protected isVerticalBar(element: FloorElement): boolean {
    return element.type === 'bar' && element.height > element.width;
  }

  protected barObjectClass(element: FloorElement): string {
    return [
      'grid h-full w-full place-items-center rounded-full border shadow-sm',
      this.isVerticalBar(element) ? 'px-2 py-4' : 'px-4 py-2',
    ].join(' ');
  }

  protected zoneClass(element: FloorElement): string {
    switch (element.type) {
      case 'bar':
        return 'border-stone-400 bg-gradient-to-b from-amber-100 to-stone-200 text-stone-900';
      case 'kitchen':
        return 'border-stone-300 bg-[repeating-linear-gradient(135deg,#f8fafc_0,#f8fafc_8px,#e7e5e4_8px,#e7e5e4_16px)] text-slate-800';
      case 'entrance':
        return 'border-stone-300 bg-white/80 text-stone-700';
      case 'bathroom':
        return 'border-slate-300 bg-slate-50 text-slate-700';
      case 'blocked':
        return 'border-slate-300 bg-[repeating-linear-gradient(135deg,#f1f5f9_0,#f1f5f9_7px,#e2e8f0_7px,#e2e8f0_14px)] text-slate-500';
      case 'stool':
        return 'border-stone-400 bg-amber-50 text-stone-800';
      default:
        return 'border-stone-300 bg-white text-stone-700';
    }
  }

  protected zoneIcon(element: FloorElement): string {
    switch (element.type) {
      case 'kitchen':
        return 'restaurant';
      case 'entrance':
        return 'door_open';
      case 'bathroom':
        return 'wc';
      case 'blocked':
        return 'block';
      case 'stool':
        return 'radio_button_unchecked';
      default:
        return 'countertops';
    }
  }

  protected tableVisualInsetClass(element: FloorElement): string {
    if (element.width > 1 || element.height > 1) {
      return 'inset-0';
    }

    return 'inset-0.5';
  }

  private getGridMovement(distance: { x: number; y: number }, gridElement: HTMLElement): { x: number; y: number } {
    const styles = getComputedStyle(gridElement);
    const columnGap = Number.parseFloat(styles.columnGap) || 0;
    const rowGap = Number.parseFloat(styles.rowGap) || 0;
    const bounds = gridElement.getBoundingClientRect();
    const columnStep = (bounds.width - columnGap * (this.store.gridColumns() - 1)) / this.store.gridColumns() + columnGap;
    const rowStep = (bounds.height - rowGap * (this.store.gridRows() - 1)) / this.store.gridRows() + rowGap;

    return {
      x: columnStep > 0 ? Math.round(distance.x / columnStep) : 0,
      y: rowStep > 0 ? Math.round(distance.y / rowStep) : 0,
    };
  }

  private clampElementPosition(element: FloorElement, x: number, y: number): { x: number; y: number } {
    const maxX = Math.max(0, this.store.gridColumns() - element.width);
    const maxY = Math.max(0, this.store.gridRows() - element.height);

    return {
      x: Math.min(Math.max(0, x), maxX),
      y: Math.min(Math.max(0, y), maxY),
    };
  }
}
