import { NgClass, NgStyle } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { FloorPlan } from '../../components/floor-plan/floor-plan';
import { TableVisual } from '../../components/table-visual/table-visual';
import type { RestaurantFloorsDto } from '../../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import type { AddFloorElementInput, FloorElement, FloorElementType, TableShape } from '../../models/restaurant-pos.models';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { RestaurantFloorLoader } from '../../state/restaurant-floor-loader.service';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';

type MatrixCell = {
  column: number;
  row: number;
};

type ElementPreset = {
  id: string;
  labelKey: string;
  type: FloorElementType;
  width: number;
  height: number;
  capacity?: number;
  shape?: TableShape;
};

const RESIZE_MATRIX_ROWS = 20;
const RESIZE_MATRIX_COLUMNS = 20;

const ELEMENT_PRESETS: ElementPreset[] = [
  { id: 'small-table', labelKey: 'restaurantPos.presets.smallTable', type: 'table', width: 2, height: 2, capacity: 2, shape: 'round' },
  { id: 'square-table', labelKey: 'restaurantPos.presets.squareTable', type: 'table', width: 2, height: 2, capacity: 4, shape: 'square' },
  { id: 'rectangular-table', labelKey: 'restaurantPos.presets.rectangularTable', type: 'table', width: 2, height: 1, capacity: 6, shape: 'rectangle' },
  { id: 'large-table', labelKey: 'restaurantPos.presets.largeTable', type: 'table', width: 2, height: 2, capacity: 8, shape: 'rectangle' },
  { id: 'long-table', labelKey: 'restaurantPos.presets.longTable', type: 'table', width: 3, height: 1, capacity: 10, shape: 'long' },
  { id: 'bar-horizontal', labelKey: 'restaurantPos.presets.barHorizontal', type: 'bar', width: 3, height: 1 },
  { id: 'bar-vertical', labelKey: 'restaurantPos.presets.barVertical', type: 'bar', width: 1, height: 3 },
  { id: 'kitchen', labelKey: 'restaurantPos.presets.kitchen', type: 'kitchen', width: 2, height: 1 },
  { id: 'bathroom', labelKey: 'restaurantPos.presets.bathroom', type: 'bathroom', width: 1, height: 1 },
  { id: 'entrance', labelKey: 'restaurantPos.presets.entrance', type: 'entrance', width: 1, height: 1 },
  { id: 'blocked-area', labelKey: 'restaurantPos.presets.blockedArea', type: 'blocked', width: 1, height: 1 },
  { id: 'stool', labelKey: 'restaurantPos.presets.stool', type: 'stool', width: 1, height: 1 },
];

@Component({
  selector: 'app-restaurant-pos-layout-page',
  imports: [Button, FloorPlan, Icon, NgClass, NgStyle, TableVisual, TranslocoPipe],
  templateUrl: './restaurant-pos-layout-page.html',
})
export class RestaurantPosLayoutPage {
  protected readonly store = inject(RestaurantPosStore);
  private readonly api = inject(RestaurantPosApiService);
  private readonly floorLoader = inject(RestaurantFloorLoader);
  private readonly restaurantContext = inject(RestaurantContextStore);
  private readonly transloco = inject(TranslocoService);
  private floorMutationGeneration = 0;
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  protected readonly resizeModalOpen = signal(false);
  protected readonly addElementModalOpen = signal(false);
  protected readonly resizeElementModalOpen = signal(false);
  protected readonly resizeRowsInput = signal(this.store.gridRows());
  protected readonly resizeColumnsInput = signal(this.store.gridColumns());
  protected readonly resizingElementId = signal<string | null>(null);
  protected readonly resizeElementWidthInput = signal(1);
  protected readonly resizeElementHeightInput = signal(1);
  protected readonly editingElementId = signal<string | null>(null);
  protected readonly selectedLayoutElement = signal<FloorElement | null>(null);
  protected readonly selectedPresetId = signal(ELEMENT_PRESETS[0].id);
  protected readonly elementLabelInput = signal('');
  protected readonly automaticElementLabel = signal('');
  protected readonly elementWidthInput = signal(1);
  protected readonly elementHeightInput = signal(1);
  protected readonly tableCapacityInput = signal(2);
  protected readonly selectedPosition = signal<MatrixCell | null>(null);
  protected readonly hoveredPosition = signal<MatrixCell | null>(null);
  protected readonly floorReady = computed(
    () => this.store.floorLoadStatus() === 'loaded' && this.store.activeFloorId() !== null,
  );
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
  protected readonly resizePreviewLabel = computed(() =>
    this.translate('restaurantPos.common.columnsRows', { columns: this.resizeColumnsInput(), rows: this.resizeRowsInput() }),
  );
  protected readonly addElementGridLabel = computed(() =>
    this.translate('restaurantPos.common.columnsRows', { columns: this.store.gridColumns(), rows: this.store.gridRows() }),
  );
  protected readonly floorElementCountLabel = computed(() =>
    this.translate('restaurantPos.layout.elementCount', { count: this.store.floorElements().length }),
  );
  protected readonly selectedLayoutElementLabel = computed(() => {
    const selectedElement = this.selectedLayoutElement();
    return selectedElement
      ? this.translate('restaurantPos.layout.selectedElement', { label: selectedElement.label })
      : this.translate('restaurantPos.layout.noElementSelected');
  });
  protected readonly selectedPreset = computed(
    () => ELEMENT_PRESETS.find((preset) => preset.id === this.selectedPresetId()) ?? ELEMENT_PRESETS[0],
  );
  protected readonly previewPosition = computed(() => this.hoveredPosition() ?? this.selectedPosition());
  protected readonly selectedPlacement = computed(() => this.buildElementInput(this.selectedPosition()));
  protected readonly selectedPositionLabel = computed(() => {
    const position = this.selectedPosition();
    return position
      ? this.translate('restaurantPos.layout.elementDialog.selectedPosition', { column: position.column, row: position.row })
      : this.translate('restaurantPos.layout.elementDialog.unselectedPosition');
  });
  protected readonly selectedPositionBadgeLabel = computed(() => {
    const position = this.selectedPosition();
    if (!position) {
      return this.translate('restaurantPos.layout.elementDialog.unselectedPositionBadge');
    }

    const endColumn = position.column + this.elementWidthInput() - 1;
    const endRow = position.row + this.elementHeightInput() - 1;

    if (position.column === endColumn && position.row === endRow) {
      return this.translate('restaurantPos.layout.elementDialog.singleCellBadge', { column: position.column, row: position.row });
    }

    return this.translate('restaurantPos.layout.elementDialog.rangeBadge', {
      startColumn: position.column,
      endColumn,
      startRow: position.row,
      endRow,
    });
  });
  protected readonly elementSizeLabel = computed(() =>
    this.translate('restaurantPos.layout.elementDialog.size', { width: this.elementWidthInput(), height: this.elementHeightInput() }),
  );
  protected readonly previewCapacityLabel = computed(() =>
    this.selectedPreset().type === 'table' ? this.translate('restaurantPos.common.pax', { count: this.tableCapacityInput() }) : null,
  );
  protected readonly localizedElementModalTitle = computed(() =>
    this.editingElementId()
      ? this.translate('restaurantPos.layout.elementDialog.editTitle')
      : this.translate('restaurantPos.layout.elementDialog.addTitle'),
  );
  protected readonly elementActionLabel = computed(() => {
    if (this.editingElementId()) {
      return this.translate('restaurantPos.layout.elementDialog.editAction');
    }

    const label = this.elementLabelInput().trim();
    return label
      ? this.translate('restaurantPos.layout.elementDialog.addNamed', { label })
      : this.translate('restaurantPos.layout.elementDialog.addElement');
  });
  protected readonly canAddSelectedElement = computed(() => {
    const placement = this.selectedPlacement();
    return (
      this.floorReady() &&
      !!placement &&
      this.elementLabelInput().trim().length > 0 &&
      this.store.canPlaceElement(placement, this.editingElementId() ?? undefined)
    );
  });

  constructor() {
    this.restaurantContext.load();

    effect(() => {
      const restaurant = this.restaurantContext.activeRestaurant();

      if (!restaurant) {
        return;
      }

      untracked(() => this.floorLoader.load(restaurant.id));
    });

    effect(() => {
      if (!this.floorReady()) {
        untracked(() => this.resetEditingState());
      }
    });
  }

  protected retryFloorLoad(): void {
    const restaurant = this.restaurantContext.activeRestaurant();

    if (restaurant) {
      this.floorLoader.retry(restaurant.id);
    }
  }

  protected openResizeModal(): void {
    if (!this.floorReady()) return;
    this.resizeRowsInput.set(this.store.gridRows());
    this.resizeColumnsInput.set(this.store.gridColumns());
    this.resizeModalOpen.set(true);
  }

  protected closeResizeModal(): void {
    this.resizeModalOpen.set(false);
  }

  protected openResizeElementModal(element: FloorElement): void {
    if (!this.floorReady() || !this.store.floorElements().some((candidate) => candidate.id === element.id)) return;
    this.resizingElementId.set(element.id);
    this.resizeElementWidthInput.set(element.width);
    this.resizeElementHeightInput.set(element.height);
    this.resizeElementModalOpen.set(true);
  }

  protected closeResizeElementModal(): void {
    this.resizeElementModalOpen.set(false);
    this.resizingElementId.set(null);
  }

  protected handleSelectedLayoutElementChange(element: FloorElement | null): void {
    if (!this.floorReady() || (element && !this.store.floorElements().some((candidate) => candidate.id === element.id))) {
      this.selectedLayoutElement.set(null);
      return;
    }
    this.selectedLayoutElement.set(element);
  }

  protected updateResizeElementWidth(event: Event): void {
    if (!this.floorReady()) return;
    this.resizeElementWidthInput.set(this.normalizePositiveInteger((event.target as HTMLInputElement).value));
  }

  protected updateResizeElementHeight(event: Event): void {
    if (!this.floorReady()) return;
    this.resizeElementHeightInput.set(this.normalizePositiveInteger((event.target as HTMLInputElement).value));
  }

  protected applyElementResize(): void {
    const elementId = this.resizingElementId();
    const restaurant = this.restaurantContext.activeRestaurant();
    const floorId = this.store.activeFloorId();

    if (!this.floorReady() || !restaurant || !floorId || !elementId) {
      return;
    }
    const floorContextEpoch = this.store.floorContextEpoch();

    const element = this.store.floorElements().find((candidate) => candidate.id === elementId);
    if (!element) {
      return;
    }

    this.store.resizeFloorElement(elementId, this.resizeElementWidthInput(), this.resizeElementHeightInput());

    const resizedElement = this.store.floorElements().find((candidate) => candidate.id === elementId);
    if (!resizedElement || resizedElement.width !== this.resizeElementWidthInput() || resizedElement.height !== this.resizeElementHeightInput()) {
      return;
    }
    const floorMutationGeneration = ++this.floorMutationGeneration;

    this.api
      .updateFloorElement(restaurant.id, floorId, elementId, {
        label: resizedElement.label,
        x: resizedElement.x,
        y: resizedElement.y,
        width: this.resizeElementWidthInput(),
        height: this.resizeElementHeightInput(),
        shape: resizedElement.shape ?? null,
        capacity: null,
      })
      .subscribe({
        next: (floors) => {
          if (this.applyFloorsResponse(floors, restaurant.id, floorId, floorContextEpoch, floorMutationGeneration)) {
            this.closeResizeElementModal();
          }
        },
        error: () => {
          if (this.isCurrentFloorContext(restaurant.id, floorId, floorContextEpoch, floorMutationGeneration)) {
            this.store.resizeFloorElement(elementId, element.width, element.height);
          }
        },
      });
  }

  protected selectResizeSize(columns: number, rows: number): void {
    if (!this.floorReady()) return;
    this.resizeColumnsInput.set(columns);
    this.resizeRowsInput.set(rows);
  }

  protected updateResizeRows(event: Event): void {
    if (!this.floorReady()) return;
    this.resizeRowsInput.set(this.normalizePositiveInteger((event.target as HTMLInputElement).value));
  }

  protected updateResizeColumns(event: Event): void {
    if (!this.floorReady()) return;
    this.resizeColumnsInput.set(this.normalizePositiveInteger((event.target as HTMLInputElement).value));
  }

  protected applyResize(): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    const floorId = this.store.activeFloorId();

    if (!this.floorReady() || !restaurant || !floorId) return;
    const floorContextEpoch = this.store.floorContextEpoch();

    this.store.setGridSize(this.resizeRowsInput(), this.resizeColumnsInput());

    if (this.store.gridRows() !== this.resizeRowsInput() || this.store.gridColumns() !== this.resizeColumnsInput()) {
      return;
    }
    const floorMutationGeneration = ++this.floorMutationGeneration;

    this.api
      .updateFloor(restaurant.id, floorId, {
        name: this.store.activeFloorName(),
        rows: this.resizeRowsInput(),
        columns: this.resizeColumnsInput(),
      })
      .subscribe((floors) => {
        if (this.applyFloorsResponse(floors, restaurant.id, floorId, floorContextEpoch, floorMutationGeneration)) {
          this.closeResizeModal();
        }
      });
  }

  protected openAddElementModal(): void {
    if (!this.floorReady()) return;
    const preset = ELEMENT_PRESETS[0];
    const label = this.getDefaultElementLabel(preset);

    this.editingElementId.set(null);
    this.selectedPresetId.set(preset.id);
    this.elementLabelInput.set(label);
    this.automaticElementLabel.set(label);
    this.elementWidthInput.set(preset.width);
    this.elementHeightInput.set(preset.height);
    this.tableCapacityInput.set(preset.capacity ?? 2);
    this.selectedPosition.set(null);
    this.hoveredPosition.set(null);
    this.addElementModalOpen.set(true);
  }

  protected openEditElementModal(element: FloorElement): void {
    if (!this.floorReady() || !this.store.floorElements().some((candidate) => candidate.id === element.id)) return;
    const matchingPreset =
      ELEMENT_PRESETS.find(
        (preset) => preset.type === element.type && preset.width === element.width && preset.height === element.height && preset.shape === element.shape,
      ) ?? ELEMENT_PRESETS.find((preset) => preset.type === element.type) ?? ELEMENT_PRESETS[0];
    const table = element.tableId ? this.store.restaurantTables().find((restaurantTable) => restaurantTable.id === element.tableId) : null;

    this.editingElementId.set(element.id);
    this.selectedPresetId.set(matchingPreset.id);
    this.elementLabelInput.set(element.label);
    this.automaticElementLabel.set('');
    this.elementWidthInput.set(element.width);
    this.elementHeightInput.set(element.height);
    this.tableCapacityInput.set(table?.capacity ?? matchingPreset.capacity ?? 2);
    this.selectedPosition.set({ column: element.x + 1, row: element.y + 1 });
    this.hoveredPosition.set(null);
    this.addElementModalOpen.set(true);
  }

  protected closeAddElementModal(): void {
    this.addElementModalOpen.set(false);
    this.editingElementId.set(null);
    this.selectedPosition.set(null);
    this.hoveredPosition.set(null);
  }

  protected updateElementPreset(event: Event): void {
    if (!this.floorReady()) return;
    const presetId = (event.target as HTMLSelectElement).value;
    const preset = ELEMENT_PRESETS.find((currentPreset) => currentPreset.id === presetId) ?? ELEMENT_PRESETS[0];
    const shouldUpdateGeneratedLabel = !this.editingElementId() && this.elementLabelInput().trim() === this.automaticElementLabel();
    const nextGeneratedLabel = this.getDefaultElementLabel(preset);

    this.selectedPresetId.set(presetId);
    this.elementWidthInput.set(preset.width);
    this.elementHeightInput.set(preset.height);
    this.tableCapacityInput.set(preset.capacity ?? this.tableCapacityInput());

    if (!this.editingElementId()) {
      this.automaticElementLabel.set(nextGeneratedLabel);
      if (shouldUpdateGeneratedLabel) {
        this.elementLabelInput.set(nextGeneratedLabel);
      }
    }
  }

  protected updateElementLabel(event: Event): void {
    if (!this.floorReady()) return;
    this.elementLabelInput.set((event.target as HTMLInputElement).value);
  }

  protected updateElementWidth(event: Event): void {
    if (!this.floorReady()) return;
    this.elementWidthInput.set(this.normalizePositiveInteger((event.target as HTMLInputElement).value));
  }

  protected updateElementHeight(event: Event): void {
    if (!this.floorReady()) return;
    this.elementHeightInput.set(this.normalizePositiveInteger((event.target as HTMLInputElement).value));
  }

  protected updateTableCapacity(event: Event): void {
    if (!this.floorReady()) return;
    this.tableCapacityInput.set(this.normalizePositiveInteger((event.target as HTMLInputElement).value));
  }

  protected selectPosition(cell: MatrixCell): void {
    if (!this.floorReady()) return;
    this.selectedPosition.set(this.normalizePlacementCell(cell));
    this.hoveredPosition.set(null);
  }

  protected previewPositionAt(cell: MatrixCell): void {
    if (!this.floorReady()) return;
    this.hoveredPosition.set(this.normalizePlacementCell(cell));
  }

  protected clearPreviewPosition(): void {
    if (!this.floorReady()) return;
    this.hoveredPosition.set(null);
  }

  protected addSelectedElement(): void {
    const placement = this.selectedPlacement();
    const editingElementId = this.editingElementId();
    const restaurant = this.restaurantContext.activeRestaurant();
    const floorId = this.store.activeFloorId();

    if (
      !this.floorReady() ||
      !restaurant ||
      !floorId ||
      !placement ||
      !this.store.canPlaceElement(placement, editingElementId ?? undefined)
    ) {
      return;
    }
    const floorContextEpoch = this.store.floorContextEpoch();

    if (editingElementId) {
      const element = this.store.floorElements().find((candidate) => candidate.id === editingElementId);
      if (!element) {
        return;
      }

      const nextElement = {
        ...element,
        ...placement,
      };

      this.store.updateFloorElementDetails(editingElementId, nextElement);
      this.store.moveFloorElement(editingElementId, placement.x, placement.y);
      this.store.updateTableCapacityForElement(editingElementId, this.tableCapacityInput());

      const updatedElement = this.store.floorElements().find((candidate) => candidate.id === editingElementId);
      if (!updatedElement) {
        return;
      }
      const floorMutationGeneration = ++this.floorMutationGeneration;

      this.api
        .updateFloorElement(restaurant.id, floorId, editingElementId, {
          label: updatedElement.label,
          x: updatedElement.x,
          y: updatedElement.y,
          width: updatedElement.width,
          height: updatedElement.height,
          shape: updatedElement.shape ?? null,
          capacity: updatedElement.tableId ? this.tableCapacityInput() : null,
        })
        .subscribe({
          next: (floors) => {
            if (this.applyFloorsResponse(floors, restaurant.id, floorId, floorContextEpoch, floorMutationGeneration)) {
              this.closeAddElementModal();
            }
          },
          error: () => {
            // Keep the dialog open so the user can retry the edit.
          },
        });
      return;
    }

    const floorMutationGeneration = ++this.floorMutationGeneration;
    this.api
      .createFloorElement(restaurant.id, floorId, {
        type: placement.type,
        label: placement.label,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
        tableId: placement.tableId ?? null,
        shape: placement.shape ?? null,
        sortOrder: this.store.nextFloorElementSortOrder(),
      })
      .subscribe({
        next: (floors) => {
          if (this.applyFloorsResponse(floors, restaurant.id, floorId, floorContextEpoch, floorMutationGeneration)) {
            this.closeAddElementModal();
          }
        },
        error: () => {
          // Keep the dialog open so the user can retry or choose another position.
        },
      });
  }

  protected handleFloorElementMoved(element: FloorElement): void {
    if (!this.floorReady() || !this.store.floorElements().some((candidate) => candidate.id === element.id)) return;
    const floorContextEpoch = this.store.floorContextEpoch();

    this.store.moveFloorElement(element.id, element.x, element.y);
    const movedElement = this.store.floorElements().find((candidate) => candidate.id === element.id);
    if (!movedElement || movedElement.x !== element.x || movedElement.y !== element.y) return;
    const floorMutationGeneration = ++this.floorMutationGeneration;

    this.persistCurrentFloorArrangement(floorContextEpoch, floorMutationGeneration);
  }

  protected handleFloorElementDeleted(element: FloorElement): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    const floorId = this.store.activeFloorId();

    if (
      !this.floorReady() ||
      !restaurant ||
      !floorId ||
      !this.store.floorElements().some((candidate) => candidate.id === element.id)
    ) {
      return;
    }
    const floorContextEpoch = this.store.floorContextEpoch();
    const floorMutationGeneration = ++this.floorMutationGeneration;

    this.api.deleteFloorElement(restaurant.id, floorId, element.id).subscribe({
      next: (floors) => this.applyFloorsResponse(floors, restaurant.id, floorId, floorContextEpoch, floorMutationGeneration),
      error: () => {
        // Keep the persisted layout visible so the user can retry the deletion.
      },
    });
  }

  protected resizeCellClass(cell: MatrixCell): string {
    return cell.column <= this.resizeColumnsInput() && cell.row <= this.resizeRowsInput()
      ? 'border-cyan-500 bg-cyan-100'
      : 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50';
  }

  protected positionCellClass(cell: MatrixCell): string {
    if (this.isSelectedAnchorCell(cell)) {
      return this.isSelectedPlacementValid()
        ? 'border-cyan-700 bg-cyan-300 shadow-[inset_0_0_0_3px_rgb(14_116_144_/_0.42)] ring-2 ring-cyan-700'
        : 'border-red-700 bg-red-300 shadow-[inset_0_0_0_3px_rgb(185_28_28_/_0.42)] ring-2 ring-red-700';
    }

    if (this.isSelectedPlacementCell(cell)) {
      return this.isSelectedPlacementValid()
        ? 'border-cyan-600 bg-cyan-200 shadow-sm ring-1 ring-cyan-500'
        : 'border-red-600 bg-red-200 ring-1 ring-red-500';
    }

    if (this.isHoveredPlacementCell(cell)) {
      return this.isPreviewPlacementValid()
        ? 'border-sky-400 bg-sky-100 shadow-[inset_0_0_0_1px_rgb(14_165_233_/_0.25)]'
        : 'border-red-400 bg-red-100 shadow-[inset_0_0_0_1px_rgb(239_68_68_/_0.25)]';
    }

    return this.isPositionUnavailable(cell)
      ? 'cursor-not-allowed border-slate-300 bg-[repeating-linear-gradient(135deg,#f8fafc_0,#f8fafc_6px,#e2e8f0_6px,#e2e8f0_12px)] opacity-70 hover:border-red-300 hover:bg-red-50'
      : 'border-emerald-300 bg-emerald-50 shadow-sm hover:border-cyan-500 hover:bg-cyan-100';
  }

  protected isResizeCellSelected(cell: MatrixCell): boolean {
    return cell.column === this.resizeColumnsInput() && cell.row === this.resizeRowsInput();
  }

  protected addElementGridStyle(): Record<string, string> {
    return {
      'grid-template-columns': `repeat(${this.store.gridColumns()}, minmax(2.25rem, 1fr))`,
    };
  }

  protected previewZoneClass(): string {
    return this.zoneClass(this.selectedPreset().type);
  }

  protected previewZoneIcon(): string {
    return this.zoneIcon(this.selectedPreset().type);
  }

  protected isPreviewVerticalBar(): boolean {
    const preset = this.selectedPreset();
    return preset.type === 'bar' && preset.height > preset.width;
  }

  protected getPresetLabel(preset: ElementPreset): string {
    return this.translate(preset.labelKey);
  }

  protected getResizeCellAriaLabel(cell: MatrixCell): string {
    return this.translate('restaurantPos.layout.resizeDialog.selectSize', { columns: cell.column, rows: cell.row });
  }

  protected getPositionCellAriaLabel(cell: MatrixCell): string {
    return this.translate('restaurantPos.layout.elementDialog.placeAt', { column: cell.column, row: cell.row });
  }

  protected previewObjectClass(): string {
    const preset = this.selectedPreset();

    if (preset.type === 'bar') {
      return preset.id === 'bar-vertical'
        ? 'h-28 w-12 rounded-full border shadow-sm'
        : 'h-12 w-full max-w-56 rounded-full border shadow-sm';
    }

    if (preset.type === 'stool') {
      return 'h-16 w-16 rounded-full border shadow-sm';
    }

    return 'min-h-20 w-full rounded-md border px-3 py-2 shadow-sm';
  }

  protected isPositionUnavailable(cell: MatrixCell): boolean {
    const placement = this.buildElementInput(this.normalizePlacementCell(cell));
    return !placement || !this.store.canPlaceElement(placement, this.editingElementId() ?? undefined);
  }

  protected positionCellAriaDisabled(cell: MatrixCell): 'true' | null {
    return this.isPositionUnavailable(cell) ? 'true' : null;
  }

  protected positionCellAriaPressed(cell: MatrixCell): 'true' | null {
    return this.isSelectedPlacementCell(cell) ? 'true' : null;
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

  private applyFloorsResponse(
    floors: RestaurantFloorsDto,
    restaurantId: string,
    floorId: string,
    floorContextEpoch: number,
    floorMutationGeneration: number,
  ): boolean {
    if (
      !this.isCurrentFloorContext(restaurantId, floorId, floorContextEpoch, floorMutationGeneration) ||
      floors.restaurantId !== restaurantId
    ) {
      return false;
    }

    const floor = floors.floors.find((candidate) => candidate.id === floorId);

    if (!floor) {
      return false;
    }

    const operationalTables = new Map(this.store.restaurantTables().map((table) => [table.id, table]));

    this.store.hydrateLayout({
      floorId: floor.id,
      floorName: floor.name,
      rows: floor.rows,
      columns: floor.columns,
      floorElements: floor.elements.map((element) => ({
        id: element.id,
        type: element.type,
        label: element.label,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        ...(element.tableId ? { tableId: element.tableId } : {}),
        ...(element.shape ? { shape: element.shape } : {}),
      })),
      restaurantTables: floors.tables.map((table) => {
        const operationalTable = operationalTables.get(table.id);
        return operationalTable
          ? {
              ...operationalTable,
              id: table.id,
              number: table.tableNumber,
              capacity: table.capacity,
            }
          : {
              id: table.id,
              number: table.tableNumber,
              capacity: table.capacity,
              status: 'free',
              total: 0,
              openDuration: '0m',
            };
      }),
    });
    this.floorLoader.refresh(restaurantId).subscribe();
    return true;
  }

  private persistCurrentFloorArrangement(floorContextEpoch: number, floorMutationGeneration: number): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    const floorId = this.store.activeFloorId();

    if (!this.floorReady() || !restaurant || !floorId) {
      return;
    }

    this.api
      .reorderFloorElements(restaurant.id, floorId, {
        elements: this.store.floorElements().map((element, index) => ({
          id: element.id,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          sortOrder: index + 1,
        })),
      })
      .subscribe((floors) => {
        this.applyFloorsResponse(floors, restaurant.id, floorId, floorContextEpoch, floorMutationGeneration);
      });
  }

  private isCurrentFloorContext(
    restaurantId: string,
    floorId: string,
    floorContextEpoch: number,
    floorMutationGeneration: number,
  ): boolean {
    return (
      this.floorReady() &&
      this.restaurantContext.activeRestaurant()?.id === restaurantId &&
      this.store.activeFloorId() === floorId &&
      this.store.floorContextEpoch() === floorContextEpoch &&
      this.floorMutationGeneration === floorMutationGeneration
    );
  }

  private resetEditingState(): void {
    this.resizeModalOpen.set(false);
    this.addElementModalOpen.set(false);
    this.resizeElementModalOpen.set(false);
    this.resizingElementId.set(null);
    this.editingElementId.set(null);
    this.selectedLayoutElement.set(null);
    this.selectedPosition.set(null);
    this.hoveredPosition.set(null);
    this.elementLabelInput.set('');
    this.automaticElementLabel.set('');
    this.selectedPresetId.set(ELEMENT_PRESETS[0].id);
  }

  private normalizePlacementCell(cell: MatrixCell): MatrixCell {
    return {
      column: Math.min(cell.column, Math.max(1, this.store.gridColumns() - this.elementWidthInput() + 1)),
      row: Math.min(cell.row, Math.max(1, this.store.gridRows() - this.elementHeightInput() + 1)),
    };
  }

  private isHoveredPlacementCell(cell: MatrixCell): boolean {
    const position = this.hoveredPosition();

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

  private isSelectedAnchorCell(cell: MatrixCell): boolean {
    const position = this.selectedPosition();
    return !!position && cell.column === position.column && cell.row === position.row;
  }

  private isSelectedPlacementCell(cell: MatrixCell): boolean {
    const position = this.selectedPosition();

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

  private isSelectedPlacementValid(): boolean {
    const placement = this.buildElementInput(this.selectedPosition());
    return !!placement && this.store.canPlaceElement(placement, this.editingElementId() ?? undefined);
  }

  private zoneClass(type: FloorElementType): string {
    switch (type) {
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

  private zoneIcon(type: FloorElementType): string {
    switch (type) {
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

  private normalizePositiveInteger(value: string): number {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue >= 1 ? Math.floor(parsedValue) : 1;
  }

  private nextTableLabel(): string {
    const nextNumber = Math.max(0, ...this.store.restaurantTables().map((table) => table.number)) + 1;
    return `M${nextNumber}`;
  }

  private nextStoolLabel(): string {
    const stoolNumbers = this.store
      .floorElements()
      .filter((element) => element.type === 'stool')
      .map((element) => {
        const match = element.label.match(/^(?:T|Stool\s+|Taburete\s+|Tamboret\s+)(?<number>\d+)$/i);
        return match?.groups?.['number'] ? Number(match.groups['number']) : 0;
      });
    const nextNumber = Math.max(stoolNumbers.length, ...stoolNumbers) + 1;
    return `T${nextNumber}`;
  }

  private getDefaultElementLabel(preset: ElementPreset): string {
    if (preset.type === 'table') {
      return this.nextTableLabel();
    }

    return preset.type === 'stool' ? this.nextStoolLabel() : this.getPresetLabel(preset);
  }

  private translate(key: string, params?: Record<string, unknown>): string {
    this.activeLang();
    return this.transloco.translate(key, params);
  }
}
