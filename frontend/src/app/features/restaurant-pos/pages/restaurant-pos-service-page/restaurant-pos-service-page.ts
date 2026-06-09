import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/ui/button/button';
import { ColorModeMenu } from '../../../../shared/ui/color-mode-menu/color-mode-menu';
import { Icon } from '../../../../shared/ui/icon/icon';
import { LanguageSelect } from '../../../../shared/ui/language-select/language-select';
import { FloorPlan, type FloorPlanFocusRequest } from '../../components/floor-plan/floor-plan';
import { PaymentGatewayDialog } from '../../components/payment-gateway-dialog/payment-gateway-dialog';
import { ProductSearchDialog } from '../../components/product-search-dialog/product-search-dialog';
import { ServicePointSearchDialog } from '../../components/service-point-search-dialog/service-point-search-dialog';
import { ServiceSummary } from '../../components/service-summary/service-summary';
import { ServiceTablePanel } from '../../components/service-table-panel/service-table-panel';
import type { FloorElement, PaymentMethod, Product, RestaurantTable, TableStatus } from '../../models/restaurant-pos.models';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';

@Component({
  selector: 'app-restaurant-pos-service-page',
  imports: [
    Button,
    ColorModeMenu,
    FloorPlan,
    Icon,
    LanguageSelect,
    PaymentGatewayDialog,
    ProductSearchDialog,
    RouterLink,
    ServicePointSearchDialog,
    ServiceSummary,
    ServiceTablePanel,
    TranslocoPipe,
  ],
  templateUrl: './restaurant-pos-service-page.html',
})
export class RestaurantPosServicePage {
  protected readonly store = inject(RestaurantPosStore);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
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
  protected readonly canCharge = computed(() => {
    const table = this.store.selectedTable();
    const order = this.store.selectedOrder();

    return !!table && !!order && order.total > 0 && table.status !== 'paid' && table.status !== 'cleaning';
  });
  protected readonly canMarkCleaning = computed(() => {
    const status = this.store.selectedTable()?.status;
    return status === 'occupied' || status === 'served' || status === 'payment_pending' || status === 'paid';
  });
  protected readonly canFreeTable = computed(() => {
    const status = this.store.selectedTable()?.status;
    return status === 'paid' || status === 'cleaning';
  });

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
    if (!this.canCharge()) {
      return;
    }

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
    if (!this.canMarkCleaning()) {
      return;
    }

    this.store.markSelectedTableForCleaning();
  }

  protected freeTable(): void {
    if (!this.canFreeTable()) {
      return;
    }

    this.store.freeSelectedTable();
  }

  protected setPaymentMethod(paymentMethod: PaymentMethod): void {
    this.store.setSelectedPaymentMethod(paymentMethod);
  }

  protected tableStatusLabel(status: TableStatus): string {
    return this.translate(`restaurantPos.tableStatus.${status}`);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.activeLang(), { style: 'currency', currency: 'EUR' }).format(value);
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
