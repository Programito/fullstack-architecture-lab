import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { SelectOption } from '../../../../shared/ui/select/select';
import { KEY_VALUE_STORAGE } from '../../../../shared/utils/storage/key-value-storage';
import { ProductCustomizerDialog, type ProductCustomizationConfirmed } from '../../../menu/components/product-customizer-dialog/product-customizer-dialog';
import { MenuPricingService } from '../../../menu/services/menu-pricing.service';
import { FloorPlan, type FloorPlanFocusRequest } from '../../components/floor-plan/floor-plan';
import { PaymentGatewayDialog } from '../../components/payment-gateway-dialog/payment-gateway-dialog';
import { ProductSearchDialog, type ProductSearchView } from '../../components/product-search-dialog/product-search-dialog';
import { ServicePointSearchDialog } from '../../components/service-point-search-dialog/service-point-search-dialog';
import { ServiceSummary } from '../../components/service-summary/service-summary';
import { ServiceTablePanel } from '../../components/service-table-panel/service-table-panel';
import type { FloorElement, OrderCourse, PaymentMethod, Product, RestaurantTable, TableStatus } from '../../models/restaurant-pos.models';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';

const PRODUCT_CATEGORY_FILTER_ORDER = ['starter', 'main', 'dessert', 'drinks', 'other'] as const satisfies readonly OrderCourse[];
const SERVICE_POINT_STATUS_FILTER_ORDER = ['free', 'occupied', 'waiting_kitchen', 'served', 'payment_pending', 'paid', 'cleaning', 'reserved'] as const satisfies readonly TableStatus[];
const FAVORITE_PRODUCTS_STORAGE_KEY = 'restaurant-pos.favorite-products';
const DEFAULT_FAVORITE_PRODUCT_IDS = ['product-1', 'product-3'] as const;
type ProductCategoryFilter = (typeof PRODUCT_CATEGORY_FILTER_ORDER)[number] | 'all';
type ServicePointStatusFilter = (typeof SERVICE_POINT_STATUS_FILTER_ORDER)[number] | 'all';

const isProductCategoryFilter = (value: string): value is ProductCategoryFilter =>
  value === 'all' || PRODUCT_CATEGORY_FILTER_ORDER.includes(value as (typeof PRODUCT_CATEGORY_FILTER_ORDER)[number]);
const isServicePointStatusFilter = (value: string): value is ServicePointStatusFilter =>
  value === 'all' || SERVICE_POINT_STATUS_FILTER_ORDER.includes(value as (typeof SERVICE_POINT_STATUS_FILTER_ORDER)[number]);

@Component({
  selector: 'app-restaurant-pos-service-page',
  imports: [
    Button,
    FloorPlan,
    Icon,
    PaymentGatewayDialog,
    ProductCustomizerDialog,
    ProductSearchDialog,
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
  private readonly storage = inject(KEY_VALUE_STORAGE);
  private readonly menuPricing = inject(MenuPricingService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  protected readonly productSearchOpen = signal(false);
  protected readonly productSearchQuery = signal('');
  protected readonly productSearchView = signal<ProductSearchView>('all');
  protected readonly productCategoryFilter = signal<ProductCategoryFilter>('all');
  protected readonly favoriteProductIds = signal<readonly string[]>(this.loadFavoriteProductIds());
  protected readonly lastAddedProductId = signal<string | null>(null);
  protected readonly productCustomizerOpen = signal(false);
  protected readonly customizingProductId = signal<string | null>(null);
  protected readonly servicePointSearchOpen = signal(false);
  protected readonly servicePointSearchQuery = signal('');
  protected readonly servicePointStatusFilter = signal<ServicePointStatusFilter>('all');
  protected readonly lastSelectedTableId = signal<string | null>(null);
  protected readonly floorFocusRequest = signal<FloorPlanFocusRequest | null>(null);
  protected readonly cardGatewayOpen = signal(false);
  protected readonly cardGatewayStatus = signal<'connecting' | 'rejected'>('connecting');

  protected readonly filteredProducts = computed(() => {
    const query = this.normalizeSearch(this.productSearchQuery());
    const categoryFilter = this.productCategoryFilter();
    const favoriteProductIds = new Set(this.favoriteProductIds());
    const products = this.store
      .products()
      .filter((product) => product.available)
      .filter((product) => this.productSearchView() === 'all' || favoriteProductIds.has(product.id))
      .filter((product) => categoryFilter === 'all' || product.course === categoryFilter);

    if (!query) {
      return products;
    }

    return products.filter((product) => this.productSearchText(product).includes(query));
  });
  protected readonly productCategoryOptions = computed<SelectOption[]>(() => [
    { label: this.translate('restaurantPos.service.allProductCategories'), value: 'all' },
    ...PRODUCT_CATEGORY_FILTER_ORDER.map((category) => ({
      label: this.translate(`restaurantPos.course.${category}`),
      value: category,
    })),
  ]);
  protected readonly productQuantities = computed<Record<string, number>>(() =>
    (this.store.selectedOrder()?.lines ?? []).reduce<Record<string, number>>((quantities, line) => {
      quantities[line.productId] = (quantities[line.productId] ?? 0) + line.quantity;
      return quantities;
    }, {}),
  );
  protected readonly customizingProduct = computed(() => {
    const productId = this.customizingProductId();
    return productId ? (this.store.products().find((product) => product.id === productId) ?? null) : null;
  });
  protected readonly customizingModifierGroups = computed(() => {
    const product = this.customizingProduct();
    return product ? this.menuPricing.getModifierGroupsForProduct(product) : [];
  });
  protected readonly filteredServicePoints = computed(() => {
    const query = this.normalizeSearch(this.servicePointSearchQuery());
    const statusFilter = this.servicePointStatusFilter();
    const servicePoints = this.store.servicePoints().filter((servicePoint) => statusFilter === 'all' || servicePoint.table.status === statusFilter);

    if (!query) {
      return servicePoints;
    }

    return servicePoints.filter((servicePoint) => this.servicePointSearchText(servicePoint.element, servicePoint.table).includes(query));
  });
  protected readonly servicePointStatusOptions = computed<SelectOption[]>(() => [
    { label: this.translate('restaurantPos.service.allServicePointStatuses'), value: 'all' },
    ...SERVICE_POINT_STATUS_FILTER_ORDER.map((status) => ({
      label: this.tableStatusLabel(status),
      value: status,
    })),
  ]);
  protected readonly lastSelectedServicePoint = computed(() => {
    const lastSelectedTableId = this.lastSelectedTableId();
    return lastSelectedTableId ? (this.store.servicePoints().find((servicePoint) => servicePoint.table.id === lastSelectedTableId) ?? null) : null;
  });
  protected readonly returnToLastServicePointLabel = computed(() => {
    const lastSelectedServicePoint = this.lastSelectedServicePoint();
    return lastSelectedServicePoint
      ? this.translate('restaurantPos.service.returnToLastServicePoint', {
          label: this.servicePointDisplayLabel(lastSelectedServicePoint.element),
        })
      : '';
  });
  protected readonly selectedTableTitle = computed(() => {
    const table = this.store.selectedTable();
    const servicePoint = this.store.selectedServicePoint();

    if (!table) {
      return this.translate('restaurantPos.service.noTableTitle');
    }

    return servicePoint?.element.type === 'stool'
      ? this.compactServicePointLabel(servicePoint.element)
      : this.translate('restaurantPos.service.tableTitle', { number: table.number });
  });

  constructor() {
    effect(() => {
      this.storage.setItem(FAVORITE_PRODUCTS_STORAGE_KEY, JSON.stringify(this.favoriteProductIds()));
    });
  }

  protected occupySelectedTable(): void {
    this.store.occupySelectedTable();
  }

  protected openProductSearch(): void {
    this.productSearchOpen.set(true);
  }

  protected closeProductSearch(): void {
    this.productSearchOpen.set(false);
    this.closeProductCustomizer();
    this.productSearchQuery.set('');
    this.productCategoryFilter.set('all');
    this.lastAddedProductId.set(null);
  }

  protected openServicePointSearch(): void {
    this.servicePointSearchOpen.set(true);
  }

  protected closeServicePointSearch(): void {
    this.servicePointSearchOpen.set(false);
    this.servicePointSearchQuery.set('');
    this.servicePointStatusFilter.set('all');
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

  protected setServicePointStatusFilter(status: string): void {
    if (isServicePointStatusFilter(status)) {
      this.servicePointStatusFilter.set(status);
    }
  }

  protected selectServicePoint(element: FloorElement): void {
    if (!element.tableId) {
      return;
    }

    this.rememberCurrentServicePoint(element.tableId);
    this.store.selectTable(element.tableId);
    this.floorFocusRequest.set({ elementId: element.id, requestId: Date.now() });
    this.closeServicePointSearch();
  }

  protected selectServicePointFromFloor(element: FloorElement): void {
    if (element.tableId) {
      this.rememberCurrentServicePoint(element.tableId);
    }
  }

  protected returnToLastServicePoint(): void {
    const lastSelectedServicePoint = this.lastSelectedServicePoint();

    if (lastSelectedServicePoint) {
      this.selectServicePoint(lastSelectedServicePoint.element);
    }
  }

  protected updateProductSearch(query: string): void {
    this.productSearchQuery.set(query);
    this.lastAddedProductId.set(null);
  }

  protected submitProductSearch(query: string): void {
    this.productSearchQuery.set(query);

    if (this.filteredProducts().length === 1) {
      this.addProduct(this.filteredProducts()[0].id);
    }
  }

  protected setProductSearchView(view: ProductSearchView): void {
    this.productSearchView.set(view);
    this.lastAddedProductId.set(null);
  }

  protected setProductCategoryFilter(category: string): void {
    if (isProductCategoryFilter(category)) {
      this.productCategoryFilter.set(category);
      this.lastAddedProductId.set(null);
    }
  }

  protected toggleFavoriteProduct(productId: string): void {
    this.favoriteProductIds.update((favoriteProductIds) =>
      favoriteProductIds.includes(productId)
        ? favoriteProductIds.filter((currentProductId) => currentProductId !== productId)
        : [...favoriteProductIds, productId],
    );
  }

  protected addProduct(productId: string): void {
    const product = this.store.products().find((currentProduct) => currentProduct.id === productId);

    if (!this.store.selectedTableId()) {
      this.store.addProductToSelectedTable(productId);
      return;
    }

    if (product?.modifierGroupIds.length) {
      this.customizingProductId.set(productId);
      this.productCustomizerOpen.set(true);
      return;
    }

    this.store.addProductToSelectedTable(productId);
    this.lastAddedProductId.set(productId);
  }

  protected closeProductCustomizer(): void {
    this.productCustomizerOpen.set(false);
    this.customizingProductId.set(null);
  }

  protected confirmProductCustomization(customization: ProductCustomizationConfirmed): void {
    this.store.addCustomizedProductToSelectedTable(
      customization.productId,
      customization.selectedModifierOptionIds,
      customization.kitchenNote,
    );
    this.lastAddedProductId.set(customization.productId);
    this.closeProductCustomizer();
  }

  protected sendToKitchen(): void {
    this.store.sendSelectedOrderToKitchen();
  }

  protected markServed(): void {
    this.store.markSelectedOrderAsServed();
  }

  protected increaseProductQuantity(productId: string): void {
    this.store.increaseSelectedOrderLine(productId);
  }

  protected decreaseProductQuantity(productId: string): void {
    this.store.decreaseSelectedOrderLine(productId);
  }

  protected markProductReady(productId: string): void {
    this.store.markSelectedOrderLineReady(productId);
  }

  protected markProductServed(productId: string): void {
    this.store.markSelectedOrderLineServed(productId);
  }

  protected removeProduct(productId: string): void {
    this.store.removeSelectedOrderLine(productId);
  }

  protected updateProductNote(change: { lineId: string; note: string }): void {
    this.store.updateSelectedOrderLineNote(change.lineId, change.note);
  }

  protected chargeTable(): void {
    if (!this.store.selectedServiceInfo()?.canCharge) {
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
    if (!this.store.selectedServiceInfo()?.canMarkCleaning) {
      return;
    }

    this.store.markSelectedTableForCleaning();
  }

  protected freeTable(): void {
    if (!this.store.selectedServiceInfo()?.canFreeTable) {
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

  private compactServicePointLabel(element: FloorElement): string {
    const match = element.label.match(/^(?:Stool|Taburete|Tamboret)\s*(?<number>\d+)?$/i);
    return match?.groups?.['number'] ? `T${match.groups['number']}` : element.label;
  }

  private servicePointDisplayLabel(element: FloorElement): string {
    return element.type === 'stool' ? this.compactServicePointLabel(element) : element.label;
  }

  private rememberCurrentServicePoint(nextTableId: string): void {
    const selectedTableId = this.store.selectedTableId();
    if (selectedTableId && selectedTableId !== nextTableId) {
      this.lastSelectedTableId.set(selectedTableId);
    }
  }

  private productSearchText(product: Product): string {
    return this.normalizeSearch([product.name, product.category, product.categoryId, ...(product.allergens ?? [])].filter(Boolean).join(' '));
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

  private loadFavoriteProductIds(): readonly string[] {
    const storedValue = this.storage.getItem(FAVORITE_PRODUCTS_STORAGE_KEY);

    if (!storedValue) {
      return DEFAULT_FAVORITE_PRODUCT_IDS;
    }

    try {
      const parsedValue = JSON.parse(storedValue);
      return Array.isArray(parsedValue) && parsedValue.every((value) => typeof value === 'string') ? parsedValue : DEFAULT_FAVORITE_PRODUCT_IDS;
    } catch {
      return DEFAULT_FAVORITE_PRODUCT_IDS;
    }
  }
}
