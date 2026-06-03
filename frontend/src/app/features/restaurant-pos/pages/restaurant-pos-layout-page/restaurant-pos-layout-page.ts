import { NgClass, NgStyle } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '../../../../shared/ui/button/button';
import { FloorPlan } from '../../components/floor-plan/floor-plan';
import type { AddFloorElementInput, FloorElement, FloorElementType, TableShape } from '../../models/restaurant-pos.models';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';

type MatrixCell = {
  column: number;
  row: number;
};

type ElementPreset = {
  id: string;
  label: string;
  type: FloorElementType;
  width: number;
  height: number;
  capacity?: number;
  shape?: TableShape;
};

const RESIZE_MATRIX_ROWS = 12;
const RESIZE_MATRIX_COLUMNS = 12;

const ELEMENT_PRESETS: ElementPreset[] = [
  { id: 'small-table', label: 'Small table 2 pax', type: 'table', width: 1, height: 1, capacity: 2, shape: 'round' },
  { id: 'square-table', label: 'Square table 4 pax', type: 'table', width: 2, height: 2, capacity: 4, shape: 'square' },
  { id: 'rectangular-table', label: 'Rectangular table 6 pax', type: 'table', width: 2, height: 1, capacity: 6, shape: 'rectangle' },
  { id: 'large-table', label: 'Large table 8 pax', type: 'table', width: 2, height: 2, capacity: 8, shape: 'rectangle' },
  { id: 'long-table', label: 'Long table', type: 'table', width: 3, height: 1, capacity: 10, shape: 'long' },
  { id: 'bar', label: 'Bar', type: 'bar', width: 3, height: 1 },
  { id: 'kitchen', label: 'Kitchen', type: 'kitchen', width: 2, height: 1 },
  { id: 'bathroom', label: 'Bathroom', type: 'bathroom', width: 1, height: 1 },
  { id: 'entrance', label: 'Entrance', type: 'entrance', width: 1, height: 1 },
  { id: 'blocked-area', label: 'Blocked area', type: 'blocked', width: 1, height: 1 },
  { id: 'stool', label: 'Stool', type: 'stool', width: 1, height: 1 },
];

@Component({
  selector: 'app-restaurant-pos-layout-page',
  imports: [Button, FloorPlan, NgClass, NgStyle, RouterLink],
  templateUrl: './restaurant-pos-layout-page.html',
})
export class RestaurantPosLayoutPage {
  protected readonly store = inject(RestaurantPosStore);
  protected readonly resizeModalOpen = signal(false);
  protected readonly addElementModalOpen = signal(false);
  protected readonly resizeElementModalOpen = signal(false);
  protected readonly resizeRowsInput = signal(this.store.gridRows());
  protected readonly resizeColumnsInput = signal(this.store.gridColumns());
  protected readonly resizingElementId = signal<string | null>(null);
  protected readonly resizeElementWidthInput = signal(1);
  protected readonly resizeElementHeightInput = signal(1);
  protected readonly editingElementId = signal<string | null>(null);
  protected readonly selectedPresetId = signal(ELEMENT_PRESETS[0].id);
  protected readonly elementLabelInput = signal('');
  protected readonly elementWidthInput = signal(1);
  protected readonly elementHeightInput = signal(1);
  protected readonly tableCapacityInput = signal(2);
  protected readonly selectedPosition = signal<MatrixCell | null>(null);
  protected readonly hoveredPosition = signal<MatrixCell | null>(null);
  protected readonly elementPresets = ELEMENT_PRESETS;
  protected readonly resizeCells = Array.from({ length: RESIZE_MATRIX_ROWS * RESIZE_MATRIX_COLUMNS }, (_, index) => ({
    column: (index % RESIZE_MATRIX_COLUMNS) + 1,
    row: Math.floor(index / RESIZE_MATRIX_COLUMNS) + 1,
  }));
  protected readonly floorCells = computed(() =>
    Array.from({ length: this.store.gridRows() * this.store.gridColumns() }, (_, index) => ({
      column: (index % this.store.gridColumns()) + 1,
      row: Math.floor(index / this.store.gridColumns()),
    })).map((cell) => ({ ...cell, row: cell.row + 1 })),
  );
  protected readonly resizePreviewLabel = computed(() => `${this.resizeColumnsInput()} columns x ${this.resizeRowsInput()} rows`);
  protected readonly addElementGridLabel = computed(() => `${this.store.gridColumns()} columns x ${this.store.gridRows()} rows`);
  protected readonly selectedPreset = computed(
    () => ELEMENT_PRESETS.find((preset) => preset.id === this.selectedPresetId()) ?? ELEMENT_PRESETS[0],
  );
  protected readonly previewPosition = computed(() => this.hoveredPosition() ?? this.selectedPosition());
  protected readonly selectedPlacement = computed(() => this.buildElementInput(this.selectedPosition()));
  protected readonly elementModalTitle = computed(() => (this.editingElementId() ? 'Edit element' : 'Add element'));
  protected readonly canAddSelectedElement = computed(() => {
    const placement = this.selectedPlacement();
    return (
      !!placement &&
      this.elementLabelInput().trim().length > 0 &&
      this.store.canPlaceElement(placement, this.editingElementId() ?? undefined)
    );
  });

  protected openResizeModal(): void {
    this.resizeRowsInput.set(this.store.gridRows());
    this.resizeColumnsInput.set(this.store.gridColumns());
    this.resizeModalOpen.set(true);
  }

  protected closeResizeModal(): void {
    this.resizeModalOpen.set(false);
  }

  protected openResizeElementModal(element: FloorElement): void {
    this.resizingElementId.set(element.id);
    this.resizeElementWidthInput.set(element.width);
    this.resizeElementHeightInput.set(element.height);
    this.resizeElementModalOpen.set(true);
  }

  protected closeResizeElementModal(): void {
    this.resizeElementModalOpen.set(false);
  }

  protected updateResizeElementWidth(event: Event): void {
    this.resizeElementWidthInput.set(this.normalizePositiveInteger((event.target as HTMLInputElement).value));
  }

  protected updateResizeElementHeight(event: Event): void {
    this.resizeElementHeightInput.set(this.normalizePositiveInteger((event.target as HTMLInputElement).value));
  }

  protected applyElementResize(): void {
    const elementId = this.resizingElementId();

    if (!elementId) {
      return;
    }

    this.store.resizeFloorElement(elementId, this.resizeElementWidthInput(), this.resizeElementHeightInput());

    const resizedElement = this.store.floorElements().find((element) => element.id === elementId);
    if (resizedElement?.width === this.resizeElementWidthInput() && resizedElement.height === this.resizeElementHeightInput()) {
      this.closeResizeElementModal();
    }
  }

  protected selectResizeSize(columns: number, rows: number): void {
    this.resizeColumnsInput.set(columns);
    this.resizeRowsInput.set(rows);
  }

  protected updateResizeRows(event: Event): void {
    this.resizeRowsInput.set(this.normalizePositiveInteger((event.target as HTMLInputElement).value));
  }

  protected updateResizeColumns(event: Event): void {
    this.resizeColumnsInput.set(this.normalizePositiveInteger((event.target as HTMLInputElement).value));
  }

  protected applyResize(): void {
    this.store.setGridSize(this.resizeRowsInput(), this.resizeColumnsInput());

    if (this.store.gridRows() === this.resizeRowsInput() && this.store.gridColumns() === this.resizeColumnsInput()) {
      this.closeResizeModal();
    }
  }

  protected openAddElementModal(): void {
    const preset = ELEMENT_PRESETS[0];

    this.editingElementId.set(null);
    this.selectedPresetId.set(preset.id);
    this.elementLabelInput.set(this.nextTableLabel());
    this.elementWidthInput.set(preset.width);
    this.elementHeightInput.set(preset.height);
    this.tableCapacityInput.set(preset.capacity ?? 2);
    this.selectedPosition.set(null);
    this.hoveredPosition.set(null);
    this.addElementModalOpen.set(true);
  }

  protected openEditElementModal(element: FloorElement): void {
    const matchingPreset =
      ELEMENT_PRESETS.find(
        (preset) => preset.type === element.type && preset.width === element.width && preset.height === element.height && preset.shape === element.shape,
      ) ?? ELEMENT_PRESETS.find((preset) => preset.type === element.type) ?? ELEMENT_PRESETS[0];
    const table = element.tableId ? this.store.restaurantTables().find((restaurantTable) => restaurantTable.id === element.tableId) : null;

    this.editingElementId.set(element.id);
    this.selectedPresetId.set(matchingPreset.id);
    this.elementLabelInput.set(element.label);
    this.elementWidthInput.set(element.width);
    this.elementHeightInput.set(element.height);
    this.tableCapacityInput.set(table?.capacity ?? matchingPreset.capacity ?? 2);
    this.selectedPosition.set({ column: element.x + 1, row: element.y + 1 });
    this.hoveredPosition.set(null);
    this.addElementModalOpen.set(true);
  }

  protected closeAddElementModal(): void {
    this.addElementModalOpen.set(false);
  }

  protected updateElementPreset(event: Event): void {
    const presetId = (event.target as HTMLSelectElement).value;
    const preset = ELEMENT_PRESETS.find((currentPreset) => currentPreset.id === presetId) ?? ELEMENT_PRESETS[0];

    this.selectedPresetId.set(presetId);
    this.elementWidthInput.set(preset.width);
    this.elementHeightInput.set(preset.height);
    this.tableCapacityInput.set(preset.capacity ?? this.tableCapacityInput());

    if (!this.editingElementId() && preset.type !== 'table') {
      this.elementLabelInput.set(preset.label);
    }
  }

  protected updateElementLabel(event: Event): void {
    this.elementLabelInput.set((event.target as HTMLInputElement).value);
  }

  protected updateElementWidth(event: Event): void {
    this.elementWidthInput.set(this.normalizePositiveInteger((event.target as HTMLInputElement).value));
  }

  protected updateElementHeight(event: Event): void {
    this.elementHeightInput.set(this.normalizePositiveInteger((event.target as HTMLInputElement).value));
  }

  protected updateTableCapacity(event: Event): void {
    this.tableCapacityInput.set(this.normalizePositiveInteger((event.target as HTMLInputElement).value));
  }

  protected selectPosition(cell: MatrixCell): void {
    this.selectedPosition.set(cell);
    this.hoveredPosition.set(null);
  }

  protected previewPositionAt(cell: MatrixCell): void {
    this.hoveredPosition.set(cell);
  }

  protected clearPreviewPosition(): void {
    this.hoveredPosition.set(null);
  }

  protected addSelectedElement(): void {
    const placement = this.selectedPlacement();
    const editingElementId = this.editingElementId();

    if (!placement || !this.store.canPlaceElement(placement, editingElementId ?? undefined)) {
      return;
    }

    if (editingElementId) {
      this.store.updateFloorElementDetails(editingElementId, placement);
      this.store.moveFloorElement(editingElementId, placement.x, placement.y);
      this.store.updateTableCapacityForElement(editingElementId, this.tableCapacityInput());
    } else {
      this.store.addFloorElement(placement);
      const addedElement = this.store.floorElements().at(-1);
      if (addedElement?.type === 'table') {
        this.store.updateTableCapacityForElement(addedElement.id, this.tableCapacityInput());
      }
    }

    this.closeAddElementModal();
  }

  protected resizeCellClass(cell: MatrixCell): string {
    return cell.column <= this.resizeColumnsInput() && cell.row <= this.resizeRowsInput()
      ? 'border-cyan-500 bg-cyan-100'
      : 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50';
  }

  protected positionCellClass(cell: MatrixCell): string {
    if (!this.isPositionPreviewCell(cell)) {
      return 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50';
    }

    return this.isPreviewPlacementValid() ? 'border-cyan-500 bg-cyan-100 text-cyan-950' : 'border-red-500 bg-red-100 text-red-950';
  }

  protected isResizeCellSelected(cell: MatrixCell): boolean {
    return cell.column === this.resizeColumnsInput() && cell.row === this.resizeRowsInput();
  }

  protected addElementGridStyle(): Record<string, string> {
    return {
      'grid-template-columns': `repeat(${this.store.gridColumns()}, minmax(2.25rem, 1fr))`,
    };
  }

  protected isSelectedPositionInvalid(): boolean {
    const placement = this.selectedPlacement();
    return !!placement && !this.store.canPlaceElement(placement, this.editingElementId() ?? undefined);
  }

  private buildElementInput(position: MatrixCell | null): AddFloorElementInput | null {
    if (!position) {
      return null;
    }

    const preset = this.selectedPreset();
    return {
      type: preset.type,
      label: this.elementLabelInput(),
      x: position.column - 1,
      y: position.row - 1,
      width: this.elementWidthInput(),
      height: this.elementHeightInput(),
      ...(preset.shape ? { shape: preset.shape } : {}),
    };
  }

  private isPositionPreviewCell(cell: MatrixCell): boolean {
    const position = this.previewPosition();

    if (!position) {
      return false;
    }

    return (
      cell.column >= position.column &&
      cell.column < position.column + this.elementWidthInput() &&
      cell.row >= position.row &&
      cell.row < position.row + this.elementHeightInput()
    );
  }

  private isPreviewPlacementValid(): boolean {
    const placement = this.buildElementInput(this.previewPosition());
    return !!placement && this.store.canPlaceElement(placement, this.editingElementId() ?? undefined);
  }

  private normalizePositiveInteger(value: string): number {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue >= 1 ? Math.floor(parsedValue) : 1;
  }

  private nextTableLabel(): string {
    const nextNumber = Math.max(0, ...this.store.restaurantTables().map((table) => table.number)) + 1;
    return `M${nextNumber}`;
  }
}
