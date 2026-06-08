import { NgClass } from '@angular/common';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/ui/button/button';
import { ColorModeMenu } from '../../../../shared/ui/color-mode-menu/color-mode-menu';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { LanguageSelect } from '../../../../shared/ui/language-select/language-select';
import { SearchInput } from '../../../../shared/ui/search-input/search-input';
import { FloorPlan, type FloorPlanFocusRequest } from '../../components/floor-plan/floor-plan';
import type { FloorElement, OrderCourse, OrderLineStatus, PaymentMethod, Product, RestaurantTable, TableStatus } from '../../models/restaurant-pos.models';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';

@Component({
  selector: 'app-restaurant-pos-service-page',
  imports: [Button, ColorModeMenu, Dialog, FloorPlan, Icon, LanguageSelect, NgClass, RouterLink, SearchInput, TranslocoPipe],
  templateUrl: './restaurant-pos-service-page.html',
})
export class RestaurantPosServicePage implements OnDestroy {
  protected readonly store = inject(RestaurantPosStore);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  private readonly now = signal(new Date());
  private readonly clockTimer = setInterval(() => this.now.set(new Date()), 60000);
  protected readonly productSearchOpen = signal(false);
  protected readonly productSearchQuery = signal('');
  protected readonly servicePointSearchOpen = signal(false);
  protected readonly servicePointSearchQuery = signal('');
  protected readonly floorFocusRequest = signal<FloorPlanFocusRequest | null>(null);
  protected readonly cardGatewayOpen = signal(false);
  protected readonly cardGatewayStatus = signal<'connecting' | 'rejected'>('connecting');

  protected readonly availableProducts = computed(() => this.store.products().filter((product) => product.available).slice(0, 4));
  protected readonly filteredProducts = computed(() => {
    const query = this.normalizeSearch(this.productSearchQuery());
    const products = this.store.products().filter((product) => product.available);

    if (!query) {
      return products;
    }

    return products.filter((product) => this.productSearchText(product).includes(query));
  });
  protected readonly servicePoints = computed(() =>
    this.store
      .floorElements()
      .filter((element) => !!element.tableId && (element.type === 'table' || element.type === 'stool'))
      .map((element) => ({
        element,
        table: this.store.restaurantTables().find((table) => table.id === element.tableId) ?? null,
      }))
      .filter((servicePoint) => !!servicePoint.table),
  );
  protected readonly filteredServicePoints = computed(() => {
    const query = this.normalizeSearch(this.servicePointSearchQuery());
    const servicePoints = this.servicePoints();

    if (!query) {
      return servicePoints;
    }

    return servicePoints.filter((servicePoint) => this.servicePointSearchText(servicePoint.element, servicePoint.table).includes(query));
  });
  protected readonly selectedTableTitle = computed(() => {
    const table = this.store.selectedTable();
    const servicePoint = this.selectedServicePoint();

    if (!table) {
      return this.translate('restaurantPos.service.noTableTitle');
    }

    return servicePoint?.type === 'stool' ? this.compactServicePointLabel(servicePoint) : this.translate('restaurantPos.service.tableTitle', { number: table.number });
  });
  protected readonly canSendToKitchen = computed(() => {
    const order = this.store.selectedOrder();
    return !!order?.lines.some((line) => line.status === 'pending');
  });
  protected readonly canMarkServed = computed(() => {
    const order = this.store.selectedOrder();
    return !!order?.lines.some((line) => line.status !== 'served');
  });

  ngOnDestroy(): void {
    clearInterval(this.clockTimer);
  }

  protected occupySelectedTable(): void {
    this.store.occupySelectedTable();
  }

  protected openProductSearch(): void {
    this.productSearchOpen.set(true);
  }

  protected closeProductSearch(): void {
    this.productSearchOpen.set(false);
    this.productSearchQuery.set('');
  }

  protected openServicePointSearch(): void {
    this.servicePointSearchOpen.set(true);
  }

  protected closeServicePointSearch(): void {
    this.servicePointSearchOpen.set(false);
    this.servicePointSearchQuery.set('');
  }

  protected updateServicePointSearch(query: string): void {
    this.servicePointSearchQuery.set(query);
  }

  protected submitServicePointSearch(query: string): void {
    this.servicePointSearchQuery.set(query);

    if (this.filteredServicePoints().length === 1) {
      this.selectServicePoint(this.filteredServicePoints()[0].element);
    }
  }

  protected selectServicePoint(element: FloorElement): void {
    if (!element.tableId) {
      return;
    }

    this.store.selectTable(element.tableId);
    this.floorFocusRequest.set({ elementId: element.id, requestId: Date.now() });
    this.closeServicePointSearch();
  }

  protected updateProductSearch(query: string): void {
    this.productSearchQuery.set(query);
  }

  protected submitProductSearch(query: string): void {
    this.productSearchQuery.set(query);

    if (this.filteredProducts().length === 1) {
      this.addProduct(this.filteredProducts()[0].id);
    }
  }

  protected addProduct(productId: string): void {
    this.store.addProductToSelectedTable(productId);
  }

  protected sendToKitchen(): void {
    this.store.sendSelectedOrderToKitchen();
  }

  protected markServed(): void {
    this.store.markSelectedOrderAsServed();
  }

  protected chargeTable(): void {
    const paymentMethod = this.store.selectedOrder()?.paymentMethod;

    if (paymentMethod === 'card') {
      this.cardGatewayStatus.set('connecting');
      this.cardGatewayOpen.set(true);
      return;
    }

    if (paymentMethod !== 'cash') {
      this.store.setSelectedPaymentMethod('cash');
    }

    this.store.chargeSelectedTable();
  }

  protected acceptCardPayment(): void {
    this.store.setSelectedPaymentMethod('card');
    this.store.chargeSelectedTable();
    this.cardGatewayOpen.set(false);
  }

  protected rejectCardPayment(): void {
    this.cardGatewayStatus.set('rejected');
  }

  protected closeCardGateway(): void {
    this.cardGatewayOpen.set(false);
    this.cardGatewayStatus.set('connecting');
  }

  protected markCleaning(): void {
    this.store.markSelectedTableForCleaning();
  }

  protected freeTable(): void {
    this.store.freeSelectedTable();
  }

  protected setPaymentMethod(paymentMethod: PaymentMethod): void {
    this.store.setSelectedPaymentMethod(paymentMethod);
  }

  protected tableStatusLabel(status: TableStatus): string {
    return this.translate(`restaurantPos.tableStatus.${status}`);
  }

  protected lineStatusLabel(status: OrderLineStatus): string {
    return this.translate(`restaurantPos.lineStatus.${status}`);
  }

  protected courseLabel(course: OrderCourse): string {
    return this.translate(`restaurantPos.course.${course}`);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.activeLang(), { style: 'currency', currency: 'EUR' }).format(value);
  }

  protected formatClock(value: string | undefined): string {
    if (!value) {
      return this.translate('restaurantPos.service.notStarted');
    }

    return new Intl.DateTimeFormat(this.activeLang(), { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  protected formatDuration(value: string | undefined, fallback: string): string {
    if (!value) {
      return fallback;
    }

    const minutes = Math.max(0, Math.floor((this.now().getTime() - new Date(value).getTime()) / 60000));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }

    return `${minutes}m`;
  }

  protected paymentMethodClass(paymentMethod: PaymentMethod): string {
    return this.store.selectedOrder()?.paymentMethod === paymentMethod ? 'border-cyan-600 bg-cyan-50 text-cyan-950' : 'theme-field';
  }

  protected serviceAttentionClass(table: RestaurantTable): string {
    if (table.status === 'waiting_kitchen') {
      return 'border-amber-200 bg-amber-50 text-amber-900';
    }

    if (table.status === 'payment_pending') {
      return 'border-orange-200 bg-orange-50 text-orange-900';
    }

    if (table.status === 'paid') {
      return 'border-cyan-200 bg-cyan-50 text-cyan-900';
    }

    if (table.status === 'cleaning') {
      return 'border-sky-200 bg-sky-50 text-sky-900';
    }

    return 'theme-chip';
  }

  protected productAllergenLabel(product: Product): string {
    return product.allergens?.length ? product.allergens.join(', ') : this.translate('restaurantPos.service.noAllergens');
  }

  protected cardGatewayStatusLabel(): string {
    return this.cardGatewayStatus() === 'rejected'
      ? this.translate('restaurantPos.paymentGateway.rejected')
      : this.translate('restaurantPos.paymentGateway.connecting');
  }

  protected servicePointTypeLabel(element: FloorElement): string {
    return element.type === 'stool' ? this.translate('restaurantPos.floorPlan.stool') : this.translate('restaurantPos.floorPlan.table');
  }

  private selectedServicePoint(): FloorElement | null {
    const selectedTableId = this.store.selectedTableId();
    return selectedTableId ? (this.store.floorElements().find((element) => element.tableId === selectedTableId) ?? null) : null;
  }

  private compactServicePointLabel(element: FloorElement): string {
    const match = element.label.match(/^(?:Stool|Taburete|Tamboret)\s*(?<number>\d+)?$/i);
    return match?.groups?.['number'] ? `T${match.groups['number']}` : element.label;
  }

  private productSearchText(product: Product): string {
    return this.normalizeSearch([product.name, product.category, ...(product.allergens ?? [])].join(' '));
  }

  private servicePointSearchText(element: FloorElement, table: RestaurantTable | null): string {
    return this.normalizeSearch(
      [
        element.label,
        this.compactServicePointLabel(element),
        this.servicePointTypeLabel(element),
        table?.number,
        table ? this.tableStatusLabel(table.status) : null,
        table?.capacity,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(' '),
    );
  }

  private normalizeSearch(value: string): string {
    return value.trim().toLocaleLowerCase();
  }

  private translate(key: string, params?: Record<string, unknown>): string {
    this.activeLang();
    return this.transloco.translate(key, params);
  }
}
