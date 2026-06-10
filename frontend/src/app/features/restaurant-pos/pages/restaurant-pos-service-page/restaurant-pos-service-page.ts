import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/ui/button/button';
import { ColorModeMenu } from '../../../../shared/ui/color-mode-menu/color-mode-menu';
import { Icon } from '../../../../shared/ui/icon/icon';
import { LanguageSelect } from '../../../../shared/ui/language-select/language-select';
import type { SelectOption } from '../../../../shared/ui/select/select';
import { KEY_VALUE_STORAGE } from '../../../../shared/utils/storage/key-value-storage';
import { FloorPlan, type FloorPlanFocusRequest } from '../../components/floor-plan/floor-plan';
import { PaymentGatewayDialog } from '../../components/payment-gateway-dialog/payment-gateway-dialog';
import { ProductSearchDialog, type ProductSearchView } from '../../components/product-search-dialog/product-search-dialog';
import { ServicePointSearchDialog } from '../../components/service-point-search-dialog/service-point-search-dialog';
import { ServiceSummary } from '../../components/service-summary/service-summary';
import { ServiceTablePanel } from '../../components/service-table-panel/service-table-panel';
import type { FloorElement, OrderCourse, PaymentMethod, Product, RestaurantTable, TableStatus } from '../../models/restaurant-pos.models';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';

const PRODUCT_CATEGORY_FILTER_ORDER = ['starter', 'main', 'dessert', 'drinks', 'other'] as const satisfies readonly OrderCourse[];
const FAVORITE_PRODUCTS_STORAGE_KEY = 'restaurant-pos.favorite-products';
const DEFAULT_FAVORITE_PRODUCT_IDS = ['product-1', 'product-3'] as const;
type ProductCategoryFilter = (typeof PRODUCT_CATEGORY_FILTER_ORDER)[number] | 'all';

const isProductCategoryFilter = (value: string): value is ProductCategoryFilter =>
  value === 'all' || PRODUCT_CATEGORY_FILTER_ORDER.includes(value as (typeof PRODUCT_CATEGORY_FILTER_ORDER)[number]);

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
  private readonly storage = inject(KEY_VALUE_STORAGE);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  protected readonly productSearchOpen = signal(false);
  protected readonly productSearchQuery = signal('');
  protected readonly productSearchView = signal<ProductSearchView>('all');
  protected readonly productCategoryFilter = signal<ProductCategoryFilter>('all');
  protected readonly favoriteProductIds = signal<readonly string[]>(this.loadFavoriteProductIds());
  protected readonly lastAddedProductId = signal<string | null>(null);
  protected readonly servicePointSearchOpen = signal(false);
  protected readonly servicePointSearchQuery = signal('');
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
      .filter((product) => categoryFilter === 'all' || this.productCourse(product) === categoryFilter);

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
  protected readonly filteredServicePoints = computed(() => {
    const query = this.normalizeSearch(this.servicePointSearchQuery());
    const servicePoints = this.store.servicePoints();

    if (!query) {
      return servicePoints;
    }

    return servicePoints.filter((servicePoint) => this.servicePointSearchText(servicePoint.element, servicePoint.table).includes(query));
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
    this.store.addProductToSelectedTable(productId);
    this.lastAddedProductId.set(productId);
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

  private productSearchText(product: Product): string {
    return this.normalizeSearch([product.name, product.category, ...(product.allergens ?? [])].join(' '));
  }

  private productCourse(product: Product): OrderCourse {
    switch (product.category.toLowerCase()) {
      case 'drinks':
      case 'coffee':
        return 'drinks';
      case 'tapas':
        return 'starter';
      case 'desserts':
        return 'dessert';
      case 'burgers':
      case 'salads':
        return 'main';
      default:
        return 'other';
    }
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
