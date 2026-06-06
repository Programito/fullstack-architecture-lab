import { NgClass, NgStyle, NgTemplateOutlet } from '@angular/common';
import { CdkDrag, CdkDragHandle, CdkDragPlaceholder, CdkDragPreview, type CdkDragEnd, type CdkDragMove } from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { Component, computed, effect, ElementRef, inject, input, OnDestroy, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { FloorElement, TableShape } from '../../models/restaurant-pos.models';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { TableVisual } from '../table-visual/table-visual';

const GRID_CELL_SIZE = '2.75rem';
const SCROLL_HINT_VISIBLE_MS = 3500;
const AUTO_SCROLL_EDGE_SIZE = 56;
const AUTO_SCROLL_MAX_STEP = 18;

type ScrollVector = {
  x: number;
  y: number;
};

type CanvasPanStart = {
  pointerX: number;
  pointerY: number;
  scrollLeft: number;
  scrollTop: number;
  pointerId: number;
};

@Component({
  selector: 'app-floor-plan',
  imports: [CdkDrag, CdkDragHandle, CdkDragPlaceholder, CdkDragPreview, CdkScrollable, Icon, NgClass, NgStyle, NgTemplateOutlet, TableVisual, TranslocoPipe],
  templateUrl: './floor-plan.html',
  styleUrl: './floor-plan.css',
})
export class FloorPlan implements OnDestroy {
  readonly layoutMode = input(true);
  readonly editElement = output<FloorElement>();
  readonly resizeElement = output<FloorElement>();
  readonly selectedElementChange = output<FloorElement | null>();

  protected readonly floorCanvas = viewChild<ElementRef<HTMLElement>>('floorCanvas');
  protected readonly store = inject(RestaurantPosStore);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  protected readonly selectedElementId = signal<string | null>(null);
  protected readonly hasCanvasOverflow = signal(false);
  protected readonly isPanningCanvas = signal(false);
  protected readonly showScrollHint = signal(false);
  protected readonly cells = computed(() =>
    Array.from({ length: this.store.gridRows() * this.store.gridColumns() }, (_, index) => ({
      x: index % this.store.gridColumns(),
      y: Math.floor(index / this.store.gridColumns()),
    })),
  );

  private hideScrollHintTimer: ReturnType<typeof setTimeout> | null = null;
  private autoScrollFrameId: number | null = null;
  private autoScrollVector: ScrollVector = { x: 0, y: 0 };
  private dragScrollStart: ScrollVector | null = null;
  private canvasPanStart: CanvasPanStart | null = null;

  constructor() {
    effect(() => {
      this.store.gridRows();
      this.store.gridColumns();
      setTimeout(() => this.evaluateCanvasOverflow());
    });
  }

  ngOnDestroy(): void {
    this.clearScrollHintTimer();
    this.stopAutoScroll(true);
    this.stopCanvasPan();
  }

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
      this.selectedElementChange.emit(element);
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

    if (confirm(this.translate('restaurantPos.floorPlan.deleteConfirm'))) {
      this.store.deleteFloorElement(element.id);
      this.selectedElementId.set(null);
      this.selectedElementChange.emit(null);
    }
  }

  protected evaluateCanvasOverflow(): void {
    const canvas = this.floorCanvas()?.nativeElement;

    if (!canvas) {
      return;
    }

    const hasOverflow = canvas.scrollWidth > canvas.clientWidth || canvas.scrollHeight > canvas.clientHeight;
    this.hasCanvasOverflow.set(hasOverflow);
    this.showScrollHint.set(hasOverflow);
    this.clearScrollHintTimer();

    if (hasOverflow) {
      this.hideScrollHintTimer = setTimeout(() => this.showScrollHint.set(false), SCROLL_HINT_VISIBLE_MS);
      return;
    }

    this.stopCanvasPan();
  }

  protected handleCanvasPointerDown(event: PointerEvent): void {
    const canvas = this.floorCanvas()?.nativeElement;

    if (!canvas || !this.hasCanvasOverflow() || event.button !== 0 || this.isInteractiveCanvasTarget(event.target)) {
      return;
    }

    this.canvasPanStart = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      scrollLeft: canvas.scrollLeft,
      scrollTop: canvas.scrollTop,
      pointerId: event.pointerId,
    };
    this.isPanningCanvas.set(true);
    this.captureCanvasPointer(canvas, event.pointerId);
    event.preventDefault();
  }

  protected handleCanvasPointerMove(event: PointerEvent): void {
    const canvas = this.floorCanvas()?.nativeElement;

    if (!canvas || !this.canvasPanStart) {
      return;
    }

    canvas.scrollLeft = this.canvasPanStart.scrollLeft + this.canvasPanStart.pointerX - event.clientX;
    canvas.scrollTop = this.canvasPanStart.scrollTop + this.canvasPanStart.pointerY - event.clientY;
  }

  protected handleCanvasPointerUp(event: PointerEvent): void {
    const canvas = this.floorCanvas()?.nativeElement;

    if (canvas && this.canvasPanStart?.pointerId === event.pointerId) {
      this.releaseCanvasPointer(canvas, event.pointerId);
    }

    this.stopCanvasPan();
  }

  protected handleDragMoved(event: CdkDragMove<HTMLElement>): void {
    if (!this.layoutMode()) {
      this.stopAutoScroll(true);
      return;
    }

    const canvas = this.floorCanvas()?.nativeElement;

    if (!canvas) {
      return;
    }

    this.dragScrollStart ??= { x: canvas.scrollLeft, y: canvas.scrollTop };
    this.autoScrollVector = this.getAutoScrollVector(event.pointerPosition, canvas);

    if (this.autoScrollVector.x === 0 && this.autoScrollVector.y === 0) {
      this.stopAutoScroll();
      return;
    }

    this.startAutoScroll();
  }

  protected handleDragEnded(event: CdkDragEnd<HTMLElement>, element: FloorElement): void {
    const scrollDelta = this.getDragScrollDelta();
    this.stopAutoScroll(true);

    if (!this.layoutMode()) {
      event.source.reset();
      return;
    }

    const gridElement = event.source.getRootElement().parentElement;
    const movement = gridElement
      ? this.getGridMovement({ x: event.distance.x + scrollDelta.x, y: event.distance.y + scrollDelta.y }, gridElement)
      : { x: 0, y: 0 };
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
      return this.localizedFloorElementLabel(element);
    }

    const table = this.store.restaurantTables().find((restaurantTable) => restaurantTable.id === element.tableId);
    return element.label || (table ? `M${table.number}` : this.translate('restaurantPos.floorPlan.table'));
  }

  protected tableCapacity(element: FloorElement): string {
    const table = element.tableId ? this.store.restaurantTables().find((restaurantTable) => restaurantTable.id === element.tableId) : null;
    return this.translate('restaurantPos.common.pax', { count: table?.capacity ?? 4 });
  }

  protected elementClass(element: FloorElement): string {
    return [
      'group relative z-10 grid min-h-10 place-items-center rounded-md border border-stone-300 bg-white/20 p-0.5 text-center transition focus:outline-none',
      this.layoutMode() ? 'cursor-pointer hover:border-cyan-300 hover:bg-white/35' : '',
      this.isSelected(element) ? 'z-40 border-cyan-400 ring-2 ring-cyan-500 ring-offset-2 ring-offset-stone-100' : '',
    ].join(' ');
  }

  protected elementAriaLabel(element: FloorElement): string {
    return this.translate('restaurantPos.floorPlan.floorElement', { label: this.displayLabel(element) });
  }

  protected tableShape(element: FloorElement): TableShape {
    return element.shape ?? 'rectangle';
  }

  protected zoneObjectLabel(element: FloorElement): string {
    return this.translate('restaurantPos.floorPlan.object', { label: this.displayLabel(element) });
  }

  protected tableShapeLabel(element: FloorElement): string {
    return this.translate('restaurantPos.floorPlan.tableShape', { shape: this.tableShape(element) });
  }

  protected actionLabel(action: 'move' | 'resize' | 'edit' | 'delete', element: FloorElement): string {
    return this.translate(`restaurantPos.floorPlan.${action}`, { label: this.displayLabel(element) });
  }

  protected cellLabel(x: number, y: number): string {
    return this.translate('restaurantPos.floorPlan.cell', { x, y });
  }

  protected isVerticalBar(element: FloorElement): boolean {
    return element.type === 'bar' && element.height > element.width;
  }

  protected barObjectClass(element: FloorElement): string {
    return [
      'grid h-full w-full place-items-center rounded-full border shadow-sm',
      this.isVerticalBar(element) ? 'px-1 py-2' : 'px-2 py-1',
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

  private getAutoScrollVector(pointerPosition: { x: number; y: number }, canvas: HTMLElement): ScrollVector {
    const bounds = canvas.getBoundingClientRect();

    return {
      x: this.getAxisAutoScroll(pointerPosition.x, bounds.left, bounds.right),
      y: this.getAxisAutoScroll(pointerPosition.y, bounds.top, bounds.bottom),
    };
  }

  private getAxisAutoScroll(pointerPosition: number, start: number, end: number): number {
    if (pointerPosition < start + AUTO_SCROLL_EDGE_SIZE) {
      return -this.getAutoScrollStep(Math.min(AUTO_SCROLL_EDGE_SIZE, start + AUTO_SCROLL_EDGE_SIZE - pointerPosition));
    }

    if (pointerPosition > end - AUTO_SCROLL_EDGE_SIZE) {
      return this.getAutoScrollStep(Math.min(AUTO_SCROLL_EDGE_SIZE, pointerPosition - (end - AUTO_SCROLL_EDGE_SIZE)));
    }

    return 0;
  }

  private getAutoScrollStep(edgeOverlap: number): number {
    return Math.max(4, Math.ceil((edgeOverlap / AUTO_SCROLL_EDGE_SIZE) * AUTO_SCROLL_MAX_STEP));
  }

  private startAutoScroll(): void {
    if (this.autoScrollFrameId !== null) {
      return;
    }

    this.autoScrollFrameId = requestAnimationFrame(() => {
      this.autoScrollFrameId = null;
      this.performAutoScrollStep();
    });
  }

  private performAutoScrollStep(): void {
    const canvas = this.floorCanvas()?.nativeElement;

    if (!canvas || (this.autoScrollVector.x === 0 && this.autoScrollVector.y === 0)) {
      return;
    }

    canvas.scrollBy({
      left: this.autoScrollVector.x,
      top: this.autoScrollVector.y,
      behavior: 'auto',
    });
    this.startAutoScroll();
  }

  private stopAutoScroll(resetDragStart = false): void {
    this.autoScrollVector = { x: 0, y: 0 };

    if (resetDragStart) {
      this.dragScrollStart = null;
    }

    if (this.autoScrollFrameId !== null) {
      cancelAnimationFrame(this.autoScrollFrameId);
      this.autoScrollFrameId = null;
    }
  }

  private getDragScrollDelta(): ScrollVector {
    const canvas = this.floorCanvas()?.nativeElement;

    if (!canvas || !this.dragScrollStart) {
      return { x: 0, y: 0 };
    }

    return {
      x: canvas.scrollLeft - this.dragScrollStart.x,
      y: canvas.scrollTop - this.dragScrollStart.y,
    };
  }

  private isInteractiveCanvasTarget(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLElement &&
      !!target.closest('[data-floor-element="true"], button, a, input, select, textarea, [role="button"]')
    );
  }

  private stopCanvasPan(): void {
    this.canvasPanStart = null;
    this.isPanningCanvas.set(false);
  }

  private captureCanvasPointer(canvas: HTMLElement, pointerId: number): void {
    try {
      canvas.setPointerCapture(pointerId);
    } catch {
      // Pointer capture is an enhancement; panning still works while events continue to arrive.
    }
  }

  private releaseCanvasPointer(canvas: HTMLElement, pointerId: number): void {
    try {
      canvas.releasePointerCapture(pointerId);
    } catch {
      // The pointer may already be released after cancellation or browser-driven cleanup.
    }
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

  private clearScrollHintTimer(): void {
    if (this.hideScrollHintTimer) {
      clearTimeout(this.hideScrollHintTimer);
      this.hideScrollHintTimer = null;
    }
  }

  private localizedFloorElementLabel(element: FloorElement): string {
    const defaultLabelByType: Partial<Record<FloorElement['type'], string>> = {
      bar: this.translate('restaurantPos.floorPlan.bar'),
      kitchen: this.translate('restaurantPos.floorPlan.kitchen'),
      entrance: this.translate('restaurantPos.floorPlan.entrance'),
      bathroom: this.translate('restaurantPos.floorPlan.bathroom'),
      blocked: this.translate('restaurantPos.floorPlan.blocked'),
      stool: this.translate('restaurantPos.floorPlan.stool'),
    };
    const defaultSourceLabelByType: Partial<Record<FloorElement['type'], string>> = {
      bar: 'Bar',
      kitchen: 'Kitchen',
      entrance: 'Entrance',
      bathroom: 'Bathroom',
      blocked: 'Blocked area',
      stool: 'Stool',
    };
    const defaultLabel = defaultLabelByType[element.type];

    if (!defaultLabel) {
      return element.label;
    }

    if (element.type === 'stool') {
      const match = element.label.match(/^Stool(?: (?<number>\d+))?$/);
      return match?.groups?.['number'] ? `${defaultLabel} ${match.groups['number']}` : defaultLabel;
    }

    return element.label === defaultSourceLabelByType[element.type] || element.label === defaultLabelByType[element.type] ? defaultLabel : element.label;
  }

  private translate(key: string, params?: Record<string, unknown>): string {
    this.activeLang();
    return this.transloco.translate(key, params);
  }
}
