import { NgClass, NgStyle, NgTemplateOutlet } from '@angular/common';
import { CdkDrag, CdkDragHandle, CdkDragPlaceholder, CdkDragPreview, type CdkDragEnd, type CdkDragMove } from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { Component, computed, effect, ElementRef, inject, input, OnDestroy, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { FloorElement, RestaurantTable, TableShape, TableStatus } from '../../models/restaurant-pos.models';
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

export type FloorPlanFocusRequest = {
  elementId: string;
  requestId: number;
};

@Component({
  selector: 'app-floor-plan',
  imports: [CdkDrag, CdkDragHandle, CdkDragPlaceholder, CdkDragPreview, CdkScrollable, Dialog, Icon, NgClass, NgStyle, NgTemplateOutlet, TableVisual, TranslocoPipe],
  templateUrl: './floor-plan.html',
  styleUrl: './floor-plan.css',
})
export class FloorPlan implements OnDestroy {
  readonly layoutMode = input(true);
  readonly focusRequest = input<FloorPlanFocusRequest | null>(null);
  readonly editElement = output<FloorElement>();
  readonly resizeElement = output<FloorElement>();
  readonly elementDeleted = output<FloorElement>();
  readonly selectedElementChange = output<FloorElement | null>();
  readonly elementMoved = output<FloorElement>();
  readonly servicePointSelected = output<FloorElement>();

  protected readonly floorCanvas = viewChild<ElementRef<HTMLElement>>('floorCanvas');
  protected readonly store = inject(RestaurantPosStore);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  protected readonly selectedElementId = signal<string | null>(null);
  protected readonly hasCanvasOverflow = signal(false);
  protected readonly isPanningCanvas = signal(false);
  protected readonly showScrollHint = signal(false);
  protected readonly serviceNow = signal(new Date());
  protected readonly pendingDeleteElement = signal<FloorElement | null>(null);
  protected readonly cells = computed(() =>
    Array.from({ length: this.store.gridRows() * this.store.gridColumns() }, (_, index) => ({
      x: index % this.store.gridColumns(),
      y: Math.floor(index / this.store.gridColumns()),
    })),
  );

  private hideScrollHintTimer: ReturnType<typeof setTimeout> | null = null;
  private serviceClockTimer: ReturnType<typeof setInterval> | null = null;
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
    effect(() => {
      if (this.layoutMode()) {
        this.stopServiceClock();
        return;
      }

      this.startServiceClock();
    });
    effect(() => {
      const request = this.focusRequest();

      if (!request) {
        return;
      }

      this.focusFloorElement(request.elementId);
    });
  }

  ngOnDestroy(): void {
    this.stopServiceClock();
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
      this.servicePointSelected.emit(element);
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
    this.pendingDeleteElement.set(element);
  }

  protected closeDeleteDialog(): void {
    this.pendingDeleteElement.set(null);
  }

  protected confirmDeleteElement(): void {
    const element = this.pendingDeleteElement();
    if (!element) return;

    this.elementDeleted.emit(element);
    this.selectedElementId.set(null);
    this.selectedElementChange.emit(null);
    this.pendingDeleteElement.set(null);
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
      this.elementMoved.emit({ ...element, x: nextPosition.x, y: nextPosition.y });
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

  protected displayCompactLabel(element: FloorElement): string {
    const label = this.displayLabel(element);

    if (element.type !== 'stool') {
      return label;
    }

    const stoolMatch = label.match(/^(?:Stool|Taburete|Tamboret)(?:\s+(?<number>\d+))?$/i);
    if (stoolMatch) {
      return stoolMatch.groups?.['number'] ? `T${stoolMatch.groups['number']}` : 'T';
    }

    return label;
  }

  protected tableCapacity(element: FloorElement): string {
    const table = element.tableId ? this.store.restaurantTables().find((restaurantTable) => restaurantTable.id === element.tableId) : null;
    return this.translate('restaurantPos.common.pax', { count: table?.capacity ?? 4 });
  }

  protected elementClass(element: FloorElement): string {
    return [
      'floor-plan-theme-element group relative z-10 grid min-h-10 place-items-center rounded-md border p-0.5 text-center transition focus:outline-none',
      this.layoutMode() ? 'cursor-pointer floor-plan-theme-element-interactive' : '',
      !this.layoutMode() && element.tableId ? this.serviceTableClass(element) : '',
      this.isSelected(element) ? 'floor-plan-theme-element-selected z-40 ring-2 ring-cyan-500 ring-offset-2' : '',
    ].join(' ');
  }

  protected elementAriaLabel(element: FloorElement): string {
    if (!this.layoutMode() && element.tableId) {
      const table = this.tableForElement(element);
      return this.translate('restaurantPos.floorPlan.serviceTable', {
        label: this.displayLabel(element),
        status: this.tableStatusLabel(table?.status ?? 'free'),
      });
    }

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

  protected tableForElement(element: FloorElement): RestaurantTable | null {
    return element.tableId ? (this.store.restaurantTables().find((table) => table.id === element.tableId) ?? null) : null;
  }

  protected tableStatusLabel(status: TableStatus): string {
    return this.translate(`restaurantPos.tableStatus.${status}`);
  }

  protected tableStatusDotClass(status: TableStatus): string {
    switch (status) {
      case 'occupied':
        return 'bg-emerald-500';
      case 'waiting_kitchen':
        return 'bg-amber-500';
      case 'served':
        return 'bg-cyan-500';
      case 'payment_pending':
        return 'bg-orange-500';
      case 'paid':
        return 'bg-cyan-600';
      case 'cleaning':
        return 'bg-sky-500';
      case 'reserved':
        return 'bg-violet-500';
      default:
        return 'bg-slate-400';
    }
  }

  protected serviceTableDuration(table: RestaurantTable | null): string {
    if (!table) {
      return '';
    }

    const startedAt = table.occupiedAt ?? table.serviceStartedAt ?? table.cleaningStartedAt;
    if (!startedAt) {
      return table.openDuration;
    }

    return this.formatDuration(new Date(startedAt), this.serviceNow());
  }

  protected serviceTableTotal(table: RestaurantTable | null): string {
    return new Intl.NumberFormat(this.activeLang(), { style: 'currency', currency: 'EUR' }).format(table?.total ?? 0);
  }

  protected serviceTableClass(element: FloorElement): string {
    const table = this.tableForElement(element);

    if (!table || table.status === 'free') {
      return 'border-emerald-300 bg-emerald-50/80 text-emerald-950';
    }

    if (table.status === 'payment_pending') {
      return 'border-orange-400 bg-orange-50 text-orange-950';
    }

    if (table.status === 'paid') {
      return 'border-cyan-500 bg-cyan-50 text-cyan-950';
    }

    if (table.status === 'cleaning') {
      return 'border-sky-400 bg-sky-50 text-sky-950';
    }

    if (table.status === 'reserved') {
      return 'border-violet-400 bg-violet-50 text-violet-950';
    }

    const minutes = this.minutesSince(table.occupiedAt ?? table.serviceStartedAt);

    if (minutes >= 60) {
      return 'border-red-500 bg-red-50 text-red-950 shadow-[inset_0_0_0_2px_rgb(239_68_68_/_0.35)]';
    }

    if (minutes >= 30 || table.status === 'waiting_kitchen') {
      return 'border-amber-500 bg-amber-50 text-amber-950 shadow-[inset_0_0_0_2px_rgb(245_158_11_/_0.28)]';
    }

    return 'border-emerald-400 bg-emerald-50 text-emerald-950';
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
      const match = element.label.match(/^(?:Stool|Taburete|Tamboret)(?: (?<number>\d+))?$/);
      if (match) {
        return match.groups?.['number'] ? `${defaultLabel} ${match.groups['number']}` : defaultLabel;
      }

      return element.label;
    }

    return element.label === defaultSourceLabelByType[element.type] || element.label === defaultLabelByType[element.type] ? defaultLabel : element.label;
  }

  private translate(key: string, params?: Record<string, unknown>): string {
    this.activeLang();
    return this.transloco.translate(key, params);
  }

  private focusFloorElement(elementId: string): void {
    setTimeout(() => {
      const canvas = this.floorCanvas()?.nativeElement;
      const element = canvas?.querySelector<HTMLElement>(`[data-floor-element-id="${this.escapeAttributeValue(elementId)}"]`);

      if (!element) {
        return;
      }

      element.scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'smooth' });
      element.focus?.({ preventScroll: true });
    });
  }

  private escapeAttributeValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private startServiceClock(): void {
    if (this.serviceClockTimer) {
      return;
    }

    this.serviceClockTimer = setInterval(() => this.serviceNow.set(new Date()), 60000);
  }

  private stopServiceClock(): void {
    if (!this.serviceClockTimer) {
      return;
    }

    clearInterval(this.serviceClockTimer);
    this.serviceClockTimer = null;
  }

  private minutesSince(value: string | undefined): number {
    if (!value) {
      return 0;
    }

    const startedAt = new Date(value).getTime();
    if (!Number.isFinite(startedAt)) {
      return 0;
    }

    return Math.max(0, Math.floor((Date.now() - startedAt) / 60000));
  }

  private formatDuration(startedAt: Date, now: Date): string {
    const minutes = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 60000));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }

    return `${minutes}m`;
  }
}
