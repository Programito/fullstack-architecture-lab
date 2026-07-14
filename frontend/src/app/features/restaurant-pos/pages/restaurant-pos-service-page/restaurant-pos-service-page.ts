import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { ServicePointDetailDto } from '../../api/restaurant-pos-api.models';
import { mapRestaurantMenuComboDefinitions, mapRestaurantMenuModifierGroups, mapRestaurantMenuToProducts, mapServiceFloor, mapServicePointOrder, mapServiceTable } from '../../api/restaurant-pos-api.mappers';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { SelectOption } from '../../../../shared/ui/select/select';
import { KEY_VALUE_STORAGE } from '../../../../shared/utils/storage/key-value-storage';
import { ComboCustomizerDialog, type ComboCustomizationConfirmed } from '../../../menu/components/combo-customizer-dialog/combo-customizer-dialog';
import { ProductCustomizerDialog, type ProductCustomizationConfirmed } from '../../../menu/components/product-customizer-dialog/product-customizer-dialog';
import { MenuMockService } from '../../../menu/services/menu-mock.service';
import { MenuPricingService } from '../../../menu/services/menu-pricing.service';
import { FloorPlan, type FloorPlanFocusRequest } from '../../components/floor-plan/floor-plan';
import { PaymentGatewayDialog } from '../../components/payment-gateway-dialog/payment-gateway-dialog';
import type { ProductPickerConfiguredLineInput } from '../../components/product-search-dialog/product-picker-item.mapper';
import { ProductSearchDialog, type ProductPickerSection } from '../../components/product-search-dialog/product-search-dialog';
import { ServicePointSearchDialog } from '../../components/service-point-search-dialog/service-point-search-dialog';
import { ServiceTablePanel } from '../../components/service-table-panel/service-table-panel';
import type { FloorElement, OrderLine, PaymentMethod, Product, RestaurantTable, TableStatus } from '../../models/restaurant-pos.models';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { OrderWriteService } from '../../state/order-write.service';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';

const SERVICE_POINT_STATUS_FILTER_ORDER = ['free', 'occupied', 'waiting_kitchen', 'served', 'payment_pending', 'paid', 'cleaning', 'reserved'] as const satisfies readonly TableStatus[];
const FAVORITE_PRODUCTS_STORAGE_KEY = 'restaurant-pos.favorite-products';
const DEFAULT_FAVORITE_PRODUCT_IDS = ['product-1', 'product-3'] as const;
const BEST_SELLER_PRODUCT_IDS = ['product-1', 'product-2', 'product-3', 'product-16'] as const;
type ServicePointStatusFilter = (typeof SERVICE_POINT_STATUS_FILTER_ORDER)[number] | 'all';
type ServiceDashboardStat = {
  id: 'occupied' | 'kitchen' | 'charge' | 'sales';
  value: string;
  tone: 'neutral' | 'warning' | 'accent';
};

const isServicePointStatusFilter = (value: string): value is ServicePointStatusFilter =>
  value === 'all' || SERVICE_POINT_STATUS_FILTER_ORDER.includes(value as (typeof SERVICE_POINT_STATUS_FILTER_ORDER)[number]);

@Component({
  selector: 'app-restaurant-pos-service-page',
  imports: [
    Button,
    ComboCustomizerDialog,
    FloorPlan,
    Icon,
    PaymentGatewayDialog,
    ProductCustomizerDialog,
    ProductSearchDialog,
    RouterLink,
    ServicePointSearchDialog,
    ServiceTablePanel,
    TranslocoPipe,
  ],
  templateUrl: './restaurant-pos-service-page.html',
})
export class RestaurantPosServicePage {
  protected readonly store = inject(RestaurantPosStore);
  private readonly api = inject(RestaurantPosApiService);
  private readonly restaurantContext = inject(RestaurantContextStore);
  private readonly orderWrite = inject(OrderWriteService);
  private readonly transloco = inject(TranslocoService);
  private readonly storage = inject(KEY_VALUE_STORAGE);
  private readonly menu = inject(MenuMockService);
  private readonly menuPricing = inject(MenuPricingService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  protected readonly productSearchOpen = signal(false);
  protected readonly productSearchQuery = signal('');
  protected readonly activeProductSection = signal<ProductPickerSection>('all');
  protected readonly bestSellerProductIds = BEST_SELLER_PRODUCT_IDS;
  protected readonly favoriteProductIds = signal<readonly string[]>(this.loadFavoriteProductIds());
  protected readonly lastAddedProductId = signal<string | null>(null);
  protected readonly productCustomizerOpen = signal(false);
  protected readonly customizingProductId = signal<string | null>(null);
  protected readonly comboCustomizerOpen = signal(false);
  protected readonly customizingComboProductId = signal<string | null>(null);
  protected readonly servicePointSearchOpen = signal(false);
  protected readonly servicePointSearchQuery = signal('');
  protected readonly servicePointStatusFilter = signal<ServicePointStatusFilter>('all');
  protected readonly lastSelectedTableId = signal<string | null>(null);
  protected readonly floorFocusRequest = signal<FloorPlanFocusRequest | null>(null);
  protected readonly cardGatewayOpen = signal(false);
  protected readonly cardGatewayStatus = signal<'connecting' | 'rejected'>('connecting');

  protected readonly serviceDashboardStats = computed<ServiceDashboardStat[]>(() => {
    const servicePoints = this.store.servicePoints();
    const occupied = servicePoints.filter((point) => point.table.status !== 'free').length;
    const kitchen = servicePoints.filter((point) => point.table.status === 'waiting_kitchen').length;
    const charge = servicePoints.filter((point) => point.table.status === 'payment_pending' || point.table.status === 'served').length;

    return [
      { id: 'occupied', value: String(occupied), tone: 'neutral' as const },
      { id: 'kitchen', value: String(kitchen), tone: kitchen > 0 ? ('warning' as const) : ('neutral' as const) },
      { id: 'charge', value: String(charge), tone: charge > 0 ? ('accent' as const) : ('neutral' as const) },
      { id: 'sales', value: this.formatCurrency(this.store.salesToday()), tone: 'accent' as const },
    ];
  });
  protected readonly productPickerMode = computed<'drawer'>(() => 'drawer');
  protected readonly availableProducts = computed(() => this.store.products().filter((product) => product.available));
  protected readonly filteredProducts = computed(() => {
    const query = this.normalizeSearch(this.productSearchQuery());
    const products = this.availableProducts();

    if (query) {
      return products.filter((product) => this.productSearchText(product).includes(query));
    }

    return products.filter((product) => this.productMatchesSection(product, this.activeProductSection()));
  });
  protected readonly productQuantities = computed<Record<string, number>>(() =>
    (this.store.selectedOrder()?.lines ?? []).reduce<Record<string, number>>((quantities, line) => {
      quantities[line.productId] = (quantities[line.productId] ?? 0) + line.quantity;
      return quantities;
    }, {}),
  );
  protected readonly configuredProductLines = computed<readonly ProductPickerConfiguredLineInput[]>(() =>
    (this.store.selectedOrder()?.lines ?? [])
      .filter((line) => this.isConfigurableOrderLine(line))
      .map((line) => ({
        lineId: line.id,
        productId: line.productId,
        quantity: line.quantity,
        summary: this.orderLineOptionSummary(line),
      })),
  );
  protected readonly customizingProduct = computed(() => {
    const productId = this.customizingProductId();
    return productId ? (this.store.products().find((product) => product.id === productId) ?? null) : null;
  });
  protected readonly customizingModifierGroups = computed(() => {
    const product = this.customizingProduct();
    return product ? this.menuPricing.getModifierGroupsForProduct(product, this.menu.modifierGroups()) : [];
  });
  protected readonly customizingComboProduct = computed(() => {
    const productId = this.customizingComboProductId();
    return productId ? (this.store.products().find((product) => product.id === productId) ?? null) : null;
  });
  protected readonly customizingComboDefinition = computed(() => {
    const product = this.customizingComboProduct();
    return product ? (this.menu.comboProductDefinitions().find((definition) => definition.productId === product.id) ?? null) : null;
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
    this.restaurantContext.load();

    effect(() => {
      this.storage.setItem(FAVORITE_PRODUCTS_STORAGE_KEY, JSON.stringify(this.favoriteProductIds()));
    });

    effect(() => {
      const restaurant = this.restaurantContext.activeRestaurant();
      if (!restaurant) return;
      this.api.getRestaurantServiceFloor(restaurant.id).subscribe((serviceFloor) => {
        this.store.hydrateServiceFloor(mapServiceFloor(serviceFloor));
      });
    });

    effect(() => {
      const restaurant = this.restaurantContext.activeRestaurant();
      if (!restaurant) return;
      this.api.getRestaurantMenu(restaurant.id).subscribe((menu) => {
        const products = mapRestaurantMenuToProducts(menu);
        if (products.length > 0) {
          this.store.hydrateProducts(products);
          this.menu.hydrateModifierGroups(mapRestaurantMenuModifierGroups(menu));
          this.menu.hydrateComboDefinitions(mapRestaurantMenuComboDefinitions(menu));
        }
      });
    });

    effect(() => {
      const restaurant = this.restaurantContext.activeRestaurant();
      const tableId = this.store.selectedTableId();

      if (!restaurant || !tableId) {
        return;
      }

      this.api.getRestaurantServicePoint(restaurant.id, tableId).subscribe((servicePoint) => {
        this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
      });

      this.api.getRestaurantServicePointOrder(restaurant.id, tableId).subscribe((serviceOrder) => {
        this.store.hydrateServicePointOrder(tableId, mapServicePointOrder(serviceOrder));
      });
    });
  }

  protected occupySelectedTable(): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    const tableId = this.store.selectedTableId();

    if (!restaurant || !tableId) {
      this.store.occupySelectedTable();
      return;
    }

    this.api.occupyRestaurantServicePoint(restaurant.id, tableId).subscribe((servicePoint) => {
      this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
    });
  }

  protected openProductSearch(): void {
    this.productSearchOpen.set(true);
  }

  protected closeProductSearch(): void {
    this.productSearchOpen.set(false);
    this.closeProductCustomizer();
    this.closeComboCustomizer();
    this.productSearchQuery.set('');
    this.activeProductSection.set('all');
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

  protected setActiveProductSection(section: ProductPickerSection): void {
    this.activeProductSection.set(section);
    this.lastAddedProductId.set(null);
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

    if (product?.type === 'combo') {
      if (!this.store.selectedTableId()) {
        this.orderWrite.addProduct(productId);
        return;
      }

      this.customizingComboProductId.set(productId);
      this.comboCustomizerOpen.set(true);
      return;
    }

    if (!this.store.selectedTableId()) {
      this.orderWrite.addProduct(productId);
      return;
    }

    if (product?.modifierGroupIds.length) {
      this.customizingProductId.set(productId);
      this.productCustomizerOpen.set(true);
      return;
    }

    this.orderWrite.addProduct(productId);
    this.lastAddedProductId.set(productId);
  }

  protected addOrRepeatProduct(productId: string): void {
    const product = this.store.products().find((currentProduct) => currentProduct.id === productId);

    if (product?.type !== 'combo' && (this.productQuantities()[productId] ?? 0) > 0) {
      this.store.increaseSelectedOrderLine(productId);
      this.lastAddedProductId.set(productId);
      return;
    }

    this.addProduct(productId);
  }

  protected closeProductCustomizer(): void {
    this.productCustomizerOpen.set(false);
    this.customizingProductId.set(null);
  }

  protected closeComboCustomizer(): void {
    this.comboCustomizerOpen.set(false);
    this.customizingComboProductId.set(null);
  }

  protected confirmProductCustomization(customization: ProductCustomizationConfirmed): void {
    this.orderWrite.addCustomizedProduct(
      customization.productId,
      customization.selectedModifierOptionIds,
      customization.kitchenNote ?? '',
    );
    this.lastAddedProductId.set(customization.productId);
    this.closeProductCustomizer();
  }

  protected confirmComboCustomization(customization: ComboCustomizationConfirmed): void {
    this.orderWrite.addCombo(customization.comboProductId, customization.slotSelections);
    this.lastAddedProductId.set(customization.comboProductId);
    this.closeComboCustomizer();
  }

  protected sendToKitchen(): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    const tableId = this.store.selectedTableId();

    if (!restaurant || !tableId) {
      this.store.sendSelectedOrderToKitchen();
      return;
    }

    this.api.sendRestaurantServicePointToKitchen(restaurant.id, tableId).subscribe((servicePoint) => {
      this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
      this.api.getRestaurantServicePointOrder(restaurant.id, tableId).subscribe((serviceOrder) => {
        this.store.hydrateServicePointOrder(tableId, mapServicePointOrder(serviceOrder));
      });
    });
  }

  protected markServed(): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    const tableId = this.store.selectedTableId();

    if (!restaurant || !tableId) {
      this.store.markSelectedOrderAsServed();
      return;
    }

    this.api.markRestaurantServicePointServed(restaurant.id, tableId).subscribe((servicePoint) => {
      this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
      this.store.markSelectedOrderAsServed();
    });
  }

  protected increaseProductQuantity(productId: string): void {
    const ctx = this.resolveApiLine(productId);
    this.store.increaseSelectedOrderLine(productId);
    if (ctx) {
      this.api.updateRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id, { quantity: ctx.line.quantity + 1 }).subscribe();
    }
  }

  protected decreaseProductQuantity(productId: string): void {
    const ctx = this.resolveApiLine(productId);
    this.store.decreaseSelectedOrderLine(productId);
    if (ctx) {
      if (ctx.line.quantity <= 1) {
        this.api.deleteRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id).subscribe();
      } else {
        this.api.updateRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id, { quantity: ctx.line.quantity - 1 }).subscribe();
      }
    }
  }

  protected increaseConfiguredLine(lineId: string): void {
    const ctx = this.resolveApiLine(lineId);
    const line = this.store.selectedOrder()?.lines.find((l) => l.id === lineId);
    this.store.increaseSelectedOrderLine(lineId);
    this.lastAddedProductId.set(line?.productId ?? null);
    if (ctx) {
      this.api.updateRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id, { quantity: ctx.line.quantity + 1 }).subscribe();
    }
  }

  protected decreaseConfiguredLine(lineId: string): void {
    const ctx = this.resolveApiLine(lineId);
    this.store.decreaseSelectedOrderLine(lineId);
    if (ctx) {
      if (ctx.line.quantity <= 1) {
        this.api.deleteRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id).subscribe();
      } else {
        this.api.updateRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id, { quantity: ctx.line.quantity - 1 }).subscribe();
      }
    }
  }

  protected markProductReady(productId: string): void {
    this.store.markSelectedOrderLineReady(productId);
  }

  protected markProductServed(productId: string): void {
    this.store.markSelectedOrderLineServed(productId);
  }

  protected removeProduct(productId: string): void {
    const ctx = this.resolveApiLine(productId);
    this.store.removeSelectedOrderLine(productId);
    if (ctx) {
      this.api.deleteRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id).subscribe();
    }
  }

  protected updateProductNote(change: { lineId: string; note: string }): void {
    const ctx = this.resolveApiLine(change.lineId);
    this.store.updateSelectedOrderLineNote(change.lineId, change.note);
    if (ctx) {
      this.api.updateRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id, { kitchenNote: change.note }).subscribe();
    }
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

    this.chargeSelectedServicePoint('cash');
  }

  protected acceptCardPayment(): void {
    this.chargeSelectedServicePoint('card');
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

    const restaurant = this.restaurantContext.activeRestaurant();
    const tableId = this.store.selectedTableId();

    if (!restaurant || !tableId) {
      this.store.freeSelectedTable();
      return;
    }

    this.api.freeRestaurantServicePoint(restaurant.id, tableId).subscribe((servicePoint) => {
      this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
      this.store.freeSelectedTable();
    });
  }

  private chargeSelectedServicePoint(paymentMethod: PaymentMethod): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    const tableId = this.store.selectedTableId();
    const applyCharge = (): void => {
      this.store.setSelectedPaymentMethod(paymentMethod);
      this.store.chargeSelectedTable();

      if (paymentMethod === 'card') {
        this.cardGatewayOpen.set(false);
      }
    };

    if (!restaurant || !tableId) {
      applyCharge();
      return;
    }

    this.api.chargeRestaurantServicePoint(restaurant.id, tableId).subscribe((servicePoint) => {
      this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
      applyCharge();
    });
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
    return this.normalizeSearch(
      [
        product.name,
        product.category,
        product.categoryId,
        product.course,
        product.type,
        product.type === 'combo' ? this.translate('restaurantPos.service.combo') : null,
        product.type === 'platter' ? this.translate('restaurantPos.service.platter') : null,
        product.modifierGroupIds.length ? this.translate('restaurantPos.service.customizable') : null,
        product.course === 'drinks' ? this.translate('restaurantPos.service.drinkProducts') : null,
        product.course === 'dessert' ? this.translate('restaurantPos.service.dessertProducts') : null,
        ...(product.allergens ?? []),
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  private productMatchesSection(product: Product, section: ProductPickerSection): boolean {
    switch (section) {
      case 'favorites':
        return this.favoriteProductIds().includes(product.id);
      case 'best_sellers':
        return BEST_SELLER_PRODUCT_IDS.includes(product.id as (typeof BEST_SELLER_PRODUCT_IDS)[number]);
      case 'drinks':
        return product.course === 'drinks';
      case 'food':
        return (product.course === 'starter' || product.course === 'main') && product.type !== 'combo' && product.type !== 'platter';
      case 'combos':
        return product.type === 'combo';
      case 'platters':
        return product.type === 'platter';
      case 'desserts':
        return product.course === 'dessert';
      default:
        return true;
    }
  }

  private isConfigurableOrderLine(line: OrderLine): boolean {
    const product = this.store.products().find((currentProduct) => currentProduct.id === line.productId);

    return line.productSnapshot.productType === 'combo' || (product?.modifierGroupIds.length ?? 0) > 0;
  }

  private orderLineOptionSummary(line: OrderLine): string {
    const comboProducts = (line.selectedComboSlots ?? []).flatMap((slot) => slot.selectedProducts.map((product) => product.productName));
    const modifiers = line.selectedModifiers.map((modifier) =>
      modifier.type === 'remove' ? this.translate('restaurantPos.service.withoutModifier', { name: modifier.name }) : modifier.name,
    );
    const note = line.kitchenNote ? this.translate('restaurantPos.service.noteSummary', { note: line.kitchenNote }) : null;
    const summaryParts = [...comboProducts, ...modifiers, note].filter((part): part is string => !!part);

    return summaryParts.length ? summaryParts.join(' · ') : this.translate('restaurantPos.service.defaultProductOption');
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
    return value
      .trim()
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
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

  private resolveApiLine(lineIdOrProductId: string): { line: OrderLine; orderId: string; restaurantId: string } | null {
    const restaurant = this.restaurantContext.activeRestaurant();
    const order = this.store.selectedOrder();
    if (!restaurant || !order?.id) return null;
    const line = order.lines.find((l) => l.id === lineIdOrProductId || l.productId === lineIdOrProductId) ?? null;
    if (!line || line.id.startsWith('line:')) return null;
    return { line, orderId: order.id, restaurantId: restaurant.id };
  }

  private mapServicePointDetail(servicePoint: ServicePointDetailDto): { table: RestaurantTable; floorElement?: FloorElement | null } {
    return {
      table: mapServiceTable(servicePoint.table, servicePoint.serviceInfo.totalCents, servicePoint.floorElement?.type === 'stool'),
      ...(servicePoint.floorElement
        ? {
            floorElement: {
              id: servicePoint.floorElement.id,
              type: servicePoint.floorElement.type,
              label: servicePoint.floorElement.label,
              x: servicePoint.floorElement.x,
              y: servicePoint.floorElement.y,
              width: servicePoint.floorElement.width,
              height: servicePoint.floorElement.height,
              tableId: servicePoint.table.id,
              ...(servicePoint.floorElement.shape ? { shape: servicePoint.floorElement.shape } : {}),
            },
          }
        : {}),
    };
  }

}
