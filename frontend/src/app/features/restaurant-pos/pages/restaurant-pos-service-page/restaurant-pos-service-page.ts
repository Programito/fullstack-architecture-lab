import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { RestaurantOrderDto, ServicePointDetailDto } from '../../api/restaurant-pos-api.models';
import { switchMap, tap, type Observable } from 'rxjs';
import { mapRestaurantMenuComboDefinitions, mapRestaurantMenuModifierGroups, mapRestaurantMenuToProducts, mapRestaurantOrder, mapServicePointOrder, mapServiceTable } from '../../api/restaurant-pos-api.mappers';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
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
import type { FloorElement, OrderLine, PaymentMethod, Product, RestaurantTable, TableOrder, TableStatus } from '../../models/restaurant-pos.models';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { RestaurantFloorLoader } from '../../state/restaurant-floor-loader.service';
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
    Dialog,
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
  private readonly floorLoader = inject(RestaurantFloorLoader);
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
  protected readonly servedSelectionMode = signal(false);
  protected readonly selectedServedLineIds = signal<readonly string[]>([]);
  protected readonly chargeKitchenConfirmOpen = signal(false);
  protected readonly isCharging = signal(false);
  private readonly pendingChargePaymentMethod = signal<Exclude<PaymentMethod, 'pending'> | null>(null);
  protected readonly serviceFloorReady = computed(
    () => this.store.floorLoadStatus() === 'loaded' && this.store.activeFloorId() !== null,
  );

  protected readonly serviceDashboardStats = computed<ServiceDashboardStat[]>(() => {
    if (!this.serviceFloorReady()) {
      return [
        { id: 'occupied', value: '0', tone: 'neutral' as const },
        { id: 'kitchen', value: '0', tone: 'neutral' as const },
        { id: 'charge', value: '0', tone: 'neutral' as const },
        { id: 'sales', value: this.formatCurrency(0), tone: 'accent' as const },
      ];
    }

    const servicePoints = this.store.servicePoints();
    const occupied = this.store.occupiedTables();
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
  // Las líneas canceladas se conservan en el pedido para auditoría, pero no
  // cuentan como "añadidas": sin este filtro, quitar un plato ya enviado y
  // volver a añadirlo mostraba cantidad 2 en el buscador con solo 1 activo.
  protected readonly productQuantities = computed<Record<string, number>>(() =>
    (this.store.selectedOrder()?.lines ?? [])
      .filter(
        (line) =>
          line.status !== 'cancelled' &&
          (!this.isDeferredDirectProduct(line.productId) || this.isAdjustableDirectOrderLine(line)),
      )
      .reduce<Record<string, number>>((quantities, line) => {
        quantities[line.productId] = (quantities[line.productId] ?? 0) + line.quantity;
        return quantities;
      }, {}),
  );
  protected readonly configuredProductLines = computed<readonly ProductPickerConfiguredLineInput[]>(() =>
    (this.store.selectedOrder()?.lines ?? [])
      .filter((line) => line.status !== 'cancelled' && this.isConfigurableOrderLine(line))
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
    if (!this.serviceFloorReady()) {
      return [];
    }

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
  protected readonly servableSelectedOrderLines = computed<readonly OrderLine[]>(() =>
    (this.store.selectedOrder()?.lines ?? []).filter((line) =>
      line.status === 'sent_to_kitchen' || line.status === 'preparing' || line.status === 'ready' || line.status === 'picked_up',
    ),
  );

  constructor() {
    this.restaurantContext.load();

    effect(() => {
      this.storage.setItem(FAVORITE_PRODUCTS_STORAGE_KEY, JSON.stringify(this.favoriteProductIds()));
    });

    effect(() => {
      if (!this.serviceFloorReady()) {
        this.closeServicePointSearch();
      }
    });

    effect(() => {
      const restaurant = this.restaurantContext.activeRestaurant();

      if (restaurant) {
        this.floorLoader.load(restaurant.id);
      }
    });

    effect(() => {
      const restaurant = this.restaurantContext.activeRestaurant();
      if (!restaurant) return;
      this.api.getRestaurantMenu(restaurant.id).subscribe({
        next: (menu) => {
          const products = mapRestaurantMenuToProducts(menu);
          if (products.length > 0) {
            this.store.hydrateProducts(products);
            this.menu.hydrateModifierGroups(mapRestaurantMenuModifierGroups(menu));
            this.menu.hydrateComboDefinitions(mapRestaurantMenuComboDefinitions(menu));
          }
        },
        error: () => {
          this.store.reportApiError('restaurantPos.errors.loadFailed');
        },
      });
    });

    effect(() => {
      const restaurant = this.restaurantContext.activeRestaurant();
      const tableId = this.store.selectedTableId();

      if (!restaurant || !tableId) {
        return;
      }

      this.reloadServicePointAndOrder(restaurant.id, tableId);
    });

    effect(() => {
      this.store.selectedTableId();
      this.cancelServedSelection();
      this.cancelChargeKitchenConfirm();
    });
  }

  protected occupySelectedTable(): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    const tableId = this.store.selectedTableId();

    if (!restaurant || !tableId) {
      this.store.occupySelectedTable();
      return;
    }

    this.api.occupyRestaurantServicePoint(restaurant.id, tableId).subscribe({
      next: (servicePoint) => {
        this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
      },
      error: () => {
        this.store.reportApiError('restaurantPos.errors.servicePointActionFailed');
        this.reloadServicePointAndOrder(restaurant.id, tableId);
      },
    });
  }

  protected openProductSearch(): void {
    this.productSearchOpen.set(true);
  }

  protected closeProductSearch(): void {
    this.orderWrite.flushPendingDirectProducts();
    this.productSearchOpen.set(false);
    this.closeProductCustomizer();
    this.closeComboCustomizer();
    this.productSearchQuery.set('');
    this.activeProductSection.set('all');
    this.lastAddedProductId.set(null);
  }

  protected openServicePointSearch(): void {
    if (!this.serviceFloorReady()) {
      return;
    }

    this.servicePointSearchOpen.set(true);
  }

  protected retryFloorLoad(): void {
    const restaurant = this.restaurantContext.activeRestaurant();

    if (restaurant) {
      this.floorLoader.retry(restaurant.id);
    }
  }

  protected closeServicePointSearch(): void {
    this.servicePointSearchOpen.set(false);
    this.servicePointSearchQuery.set('');
    this.servicePointStatusFilter.set('all');
  }

  protected updateServicePointSearch(query: string): void {
    if (!this.serviceFloorReady()) {
      return;
    }

    this.servicePointSearchQuery.set(query);
  }

  protected submitServicePointSearch(query: string): void {
    if (!this.serviceFloorReady()) {
      return;
    }

    this.servicePointSearchQuery.set(query);

    if (this.filteredServicePoints().length === 1) {
      this.selectServicePoint(this.filteredServicePoints()[0].element);
    }
  }

  protected setServicePointStatusFilter(status: string): void {
    if (!this.serviceFloorReady()) {
      return;
    }

    if (isServicePointStatusFilter(status)) {
      this.servicePointStatusFilter.set(status);
    }
  }

  protected selectServicePoint(element: FloorElement): void {
    if (!this.serviceFloorReady() || !element.tableId) {
      return;
    }

    this.rememberCurrentServicePoint(element.tableId);
    this.store.selectTable(element.tableId);
    this.floorFocusRequest.set({ elementId: element.id, requestId: Date.now() });
    this.closeServicePointSearch();
  }

  protected selectServicePointFromFloor(element: FloorElement): void {
    if (this.serviceFloorReady() && element.tableId) {
      this.rememberCurrentServicePoint(element.tableId);
    }
  }

  protected returnToLastServicePoint(): void {
    if (!this.serviceFloorReady()) {
      return;
    }

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
      if (this.isDeferredDirectProduct(productId)) {
        this.orderWrite.increaseDirectProductQuantity(productId);
      } else {
        this.store.increaseSelectedOrderLine(productId);
      }
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

    this.api.sendRestaurantServicePointToKitchen(restaurant.id, tableId).subscribe({
      next: (servicePoint) => {
        this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
        this.reloadOrder(restaurant.id, tableId);
      },
      error: () => {
        this.store.reportApiError('restaurantPos.errors.sendToKitchenFailed');
        this.reloadServicePointAndOrder(restaurant.id, tableId);
      },
    });
  }

  protected enterServedSelectionMode(): void {
    this.servedSelectionMode.set(true);
    this.selectedServedLineIds.set([]);
  }

  protected toggleServedLine(lineId: string): void {
    this.selectedServedLineIds.update((lineIds) =>
      lineIds.includes(lineId) ? lineIds.filter((currentLineId) => currentLineId !== lineId) : [...lineIds, lineId],
    );
  }

  protected selectAllServedLines(): void {
    const servableLineIds = this.servableSelectedOrderLines().map((line) => line.id);
    this.selectedServedLineIds.set(
      servableLineIds.length > 0 && servableLineIds.length === this.selectedServedLineIds().length ? [] : servableLineIds,
    );
  }

  protected cancelServedSelection(): void {
    this.servedSelectionMode.set(false);
    this.selectedServedLineIds.set([]);
  }

  protected confirmMarkServedSelection(): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    const tableId = this.store.selectedTableId();
    const selectedLineIds = this.selectedServedLineIds();

    if (selectedLineIds.length === 0) {
      return;
    }

    if (!restaurant || !tableId) {
      selectedLineIds.forEach((lineId) => this.store.markSelectedOrderLineServed(lineId));
      this.cancelServedSelection();
      return;
    }

    this.api.markRestaurantServicePointServed(restaurant.id, tableId, { lineIds: [...selectedLineIds] }).subscribe({
      next: (servicePoint) => {
        this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
        selectedLineIds.forEach((lineId) => this.store.markSelectedOrderLineServed(lineId));
        this.cancelServedSelection();
      },
      error: () => {
        this.store.reportApiError('restaurantPos.errors.servicePointActionFailed');
        this.cancelServedSelection();
        this.reloadServicePointAndOrder(restaurant.id, tableId);
      },
    });
  }

  protected increaseProductQuantity(lineIdOrProductId: string): void {
    const localLine = this.findSelectedOrderLineById(lineIdOrProductId);
    const ctx = this.resolveApiLine(lineIdOrProductId);
    if (localLine && this.isAdjustableDirectOrderLine(localLine)) {
      this.orderWrite.increaseDirectProductQuantity(localLine.productId, localLine.id);
      return;
    }
    if (!localLine && this.isDeferredDirectProduct(lineIdOrProductId)) {
      this.orderWrite.increaseDirectProductQuantity(lineIdOrProductId);
      return;
    }

    this.noteSelectedOrderMutation();
    if (localLine) {
      this.store.adjustSelectedOrderLineQuantityById(localLine.id, 1);
    } else {
      this.store.increaseSelectedOrderLine(lineIdOrProductId);
    }
    if (ctx) {
      this.enqueueLineMutation(ctx.restaurantId, () =>
        this.api.updateRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id, { quantity: ctx.line.quantity + 1 }),
      );
    }
  }

  protected decreaseProductQuantity(lineIdOrProductId: string): void {
    const localLine = this.findSelectedOrderLineById(lineIdOrProductId);
    const ctx = this.resolveApiLine(lineIdOrProductId);
    if (localLine && this.isAdjustableDirectOrderLine(localLine)) {
      this.orderWrite.decreaseDirectProductQuantity(localLine.productId, localLine.id);
      return;
    }
    if (!localLine && this.isDeferredDirectProduct(lineIdOrProductId)) {
      this.orderWrite.decreaseDirectProductQuantity(lineIdOrProductId);
      return;
    }

    this.noteSelectedOrderMutation();
    if (localLine) {
      this.store.adjustSelectedOrderLineQuantityById(localLine.id, -1);
    } else {
      this.store.decreaseSelectedOrderLine(lineIdOrProductId);
    }
    if (ctx) {
      if (ctx.line.quantity <= 1) {
        this.enqueueLineMutation(ctx.restaurantId, () =>
          this.api.deleteRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id),
        );
      } else {
        this.enqueueLineMutation(ctx.restaurantId, () =>
          this.api.updateRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id, { quantity: ctx.line.quantity - 1 }),
        );
      }
    }
  }

  protected increaseConfiguredLine(lineId: string): void {
    const ctx = this.resolveApiLine(lineId);
    const line = this.store.selectedOrder()?.lines.find((l) => l.id === lineId);
    this.noteSelectedOrderMutation();
    this.store.adjustSelectedOrderLineQuantityById(lineId, 1);
    this.lastAddedProductId.set(line?.productId ?? null);
    if (ctx) {
      this.enqueueLineMutation(ctx.restaurantId, () =>
        this.api.updateRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id, { quantity: ctx.line.quantity + 1 }),
      );
    }
  }

  protected decreaseConfiguredLine(lineId: string): void {
    const ctx = this.resolveApiLine(lineId);
    this.noteSelectedOrderMutation();
    this.store.adjustSelectedOrderLineQuantityById(lineId, -1);
    if (ctx) {
      if (ctx.line.quantity <= 1) {
        this.enqueueLineMutation(ctx.restaurantId, () =>
          this.api.deleteRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id),
        );
      } else {
        this.enqueueLineMutation(ctx.restaurantId, () =>
          this.api.updateRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id, { quantity: ctx.line.quantity - 1 }),
        );
      }
    }
  }

  protected markProductReady(productId: string): void {
    this.store.markSelectedOrderLineReady(productId);
  }

  protected markProductServed(productId: string): void {
    this.store.markSelectedOrderLineServed(productId);
  }

  protected removeProduct(lineIdOrProductId: string): void {
    const localLine = this.findSelectedOrderLineById(lineIdOrProductId);
    const ctx = this.resolveApiLine(lineIdOrProductId);
    if (localLine && this.isAdjustableDirectOrderLine(localLine)) {
      this.orderWrite.removeDirectProduct(localLine.productId, localLine.id);
      return;
    }
    if (!localLine && this.isDeferredDirectProduct(lineIdOrProductId)) {
      this.orderWrite.removeDirectProduct(lineIdOrProductId);
      return;
    }
    this.noteSelectedOrderMutation();
    this.store.removeSelectedOrderLine(lineIdOrProductId);
    if (ctx) {
      // Backend only allows DELETE on pending lines; once a line has been sent to
      // kitchen (or beyond) it has to be cancelled instead so the deletion actually persists.
      if (ctx.line.status !== 'pending') {
        // La respuesta del cancel es la verdad más reciente del pedido: se aplica
        // directamente para que un GET posterior (posiblemente desfasado) no resucite la línea.
        const paymentMethod = this.store.selectedOrder()?.paymentMethod;
        this.enqueueLineMutation(
          ctx.restaurantId,
          () => this.api.cancelRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id, 'removed_by_staff'),
          {
            applyResponse: (response) => {
              const tableId = this.store.selectedTableId();
              if (!tableId) return;
              this.orderWrite.hydrateRemoteOrder(tableId, mapRestaurantOrder(response as RestaurantOrderDto, paymentMethod));
            },
          },
        );
      } else {
        this.enqueueLineMutation(ctx.restaurantId, () =>
          this.api.deleteRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id),
        );
      }
    }
  }

  protected updateProductNote(change: { lineId: string; note: string }): void {
    const ctx = this.resolveApiLine(change.lineId);
    this.noteSelectedOrderMutation();
    this.store.updateSelectedOrderLineNote(change.lineId, change.note);
    if (ctx) {
      this.enqueueLineMutation(ctx.restaurantId, () =>
        this.api.updateRestaurantOrderLine(ctx.restaurantId, ctx.orderId, ctx.line.id, { kitchenNote: change.note }),
      );
    }
  }

  protected chargeTable(): void {
    if (!this.store.selectedServiceInfo()?.canCharge || this.isCharging()) {
      return;
    }

    const paymentMethod = this.store.selectedOrder()?.paymentMethod;

    if ((this.store.selectedOrder()?.lines ?? []).some((line) => line.status === 'pending')) {
      // El aviso se muestra aunque no haya método elegido; si se confirma sin método,
      // se cobra en efectivo por defecto.
      this.pendingChargePaymentMethod.set(paymentMethod === 'card' ? 'card' : 'cash');
      this.chargeKitchenConfirmOpen.set(true);
      return;
    }

    if (paymentMethod !== 'cash' && paymentMethod !== 'card') {
      return;
    }

    if (paymentMethod === 'card') {
      this.cardGatewayStatus.set('connecting');
      this.cardGatewayOpen.set(true);
      return;
    }

    this.chargeSelectedServicePoint(paymentMethod);
  }

  protected acceptCardPayment(): void {
    if (this.isCharging()) {
      return;
    }
    this.chargeSelectedServicePoint('card');
  }

  protected rejectCardPayment(): void {
    this.cardGatewayStatus.set('rejected');
  }

  protected closeCardGateway(): void {
    if (this.isCharging()) {
      return;
    }
    this.cardGatewayOpen.set(false);
    this.cardGatewayStatus.set('connecting');
  }

  protected chargeKitchenConfirmDescription(): string {
    return this.translate('restaurantPos.service.chargeKitchenConfirmDescription');
  }

  protected cancelChargeKitchenConfirm(): void {
    this.chargeKitchenConfirmOpen.set(false);
    this.pendingChargePaymentMethod.set(null);
  }

  protected confirmChargeKitchenConfirm(): void {
    const paymentMethod = this.pendingChargePaymentMethod();
    const restaurant = this.restaurantContext.activeRestaurant();
    const tableId = this.store.selectedTableId();
    this.chargeKitchenConfirmOpen.set(false);
    this.pendingChargePaymentMethod.set(null);

    if (!paymentMethod || this.isCharging()) {
      return;
    }

    if (!restaurant || !tableId) {
      this.store.sendSelectedOrderToKitchen();
      if (paymentMethod === 'card') {
        this.cardGatewayStatus.set('connecting');
        this.cardGatewayOpen.set(true);
        return;
      }
      this.chargeSelectedServicePoint(paymentMethod);
      return;
    }

    this.isCharging.set(true);
    this.api.sendRestaurantServicePointToKitchen(restaurant.id, tableId).subscribe({
      next: (servicePoint) => {
        this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
        this.reloadOrder(restaurant.id, tableId);
        if (paymentMethod === 'card') {
          this.isCharging.set(false);
          this.cardGatewayStatus.set('connecting');
          this.cardGatewayOpen.set(true);
          return;
        }
        this.chargeSelectedServicePoint(paymentMethod);
      },
      error: () => {
        this.isCharging.set(false);
        this.store.reportApiError('restaurantPos.errors.sendToKitchenFailed');
        this.reloadServicePointAndOrder(restaurant.id, tableId);
      },
    });
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

    this.api.freeRestaurantServicePoint(restaurant.id, tableId).subscribe({
      next: (servicePoint) => {
        this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
        this.store.freeSelectedTable();
      },
      error: () => {
        this.store.reportApiError('restaurantPos.errors.servicePointActionFailed');
        this.reloadServicePointAndOrder(restaurant.id, tableId);
      },
    });
  }

  private chargeSelectedServicePoint(paymentMethod: Exclude<PaymentMethod, 'pending'>): void {
    const restaurant = this.restaurantContext.activeRestaurant();
    const tableId = this.store.selectedTableId();
    const selectedOrder = this.store.selectedOrder();
    const orderId = selectedOrder?.id;
    const amountCents = Math.round(((selectedOrder?.balance ?? selectedOrder?.total ?? 0) * 100));
    const applyCharge = (): void => {
      this.store.setSelectedPaymentMethod(paymentMethod);
      this.store.chargeSelectedTable();

      if (paymentMethod === 'card') {
        this.cardGatewayOpen.set(false);
      }
    };
    const onChargeError = (): void => {
      if (paymentMethod === 'card') {
        this.cardGatewayStatus.set('rejected');
      }
      this.store.reportApiError('restaurantPos.errors.chargeFailed');
      if (restaurant && tableId) {
        this.reloadServicePointAndOrder(restaurant.id, tableId);
      }
    };

    if (!restaurant || !tableId) {
      applyCharge();
      return;
    }

    if (!orderId || amountCents <= 0) {
      this.isCharging.set(true);
      this.api.chargeRestaurantServicePoint(restaurant.id, tableId).subscribe({
        next: (servicePoint) => {
          this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
          applyCharge();
          this.isCharging.set(false);
        },
        error: () => {
          this.isCharging.set(false);
          onChargeError();
        },
      });
      return;
    }

    this.isCharging.set(true);
    this.api
      .chargeRestaurantServicePoint(restaurant.id, tableId)
      .pipe(
        tap((servicePoint) => {
          this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
        }),
        switchMap(() => this.api.registerRestaurantOrderPayment(restaurant.id, orderId, amountCents, paymentMethod)),
        switchMap((paidOrder) =>
          this.api.getRestaurantServicePoint(restaurant.id, tableId).pipe(
            tap((servicePoint) => {
              this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
              this.store.hydrateServicePointOrder(tableId, mapRestaurantOrder(paidOrder, paymentMethod));
            }),
          ),
        ),
      )
      .subscribe({
        next: () => {
          // El backend ya confirmó el pago: se conserva el pedido en estado 'paid'
          // (y se archiva en el histórico) en lugar de vaciar la mesa.
          this.store.markSelectedOrderPaid(paymentMethod);
          if (paymentMethod === 'card') {
            this.cardGatewayOpen.set(false);
          }
          this.isCharging.set(false);
        },
        error: () => {
          this.isCharging.set(false);
          onChargeError();
        },
      });
  }

  /** Avanza la época de mutación local de la mesa seleccionada (guard anti-respuestas obsoletas). */
  private noteSelectedOrderMutation(): void {
    const tableId = this.store.selectedTableId();
    if (tableId) {
      this.orderWrite.noteLocalOrderMutation(tableId);
    }
  }

  /** Encola la mutación en la cola serializada por mesa; el refresco llega al vaciarse la cola. */
  private enqueueLineMutation(
    restaurantId: string,
    mutation: () => Observable<unknown>,
    options?: { errorMessageKey?: string; applyResponse?: (response: unknown) => void },
  ): void {
    const tableId = this.store.selectedTableId();
    if (!tableId) return;
    this.orderWrite.enqueueLineMutation(tableId, restaurantId, mutation, options);
  }

  private reloadOrder(restaurantId: string, tableId: string): void {
    const expectedEpoch = this.orderWrite.orderMutationEpoch(tableId);
    this.api.getRestaurantServicePointOrder(restaurantId, tableId).subscribe({
      next: (serviceOrder) => {
        const mappedOrder = mapServicePointOrder(serviceOrder);
        this.orderWrite.hydrateRemoteOrder(tableId, mappedOrder, expectedEpoch);
        if (mappedOrder) {
          this.autoServeStaleKitchenLines(restaurantId, tableId, mappedOrder);
        }
      },
      error: () => undefined,
    });
  }

  private reloadServicePointAndOrder(restaurantId: string, tableId: string): void {
    this.api.getRestaurantServicePoint(restaurantId, tableId).subscribe({
      next: (servicePoint) => {
        this.store.hydrateServicePoint(this.mapServicePointDetail(servicePoint));
      },
      error: () => undefined,
    });
    this.reloadOrder(restaurantId, tableId);
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

  private isDeferredDirectProduct(productId: string): boolean {
    const product = this.store.products().find((currentProduct) => currentProduct.id === productId);
    return !!product && product.type === 'simple' && product.modifierGroupIds.length === 0 && !!product.restaurantProductId;
  }

  private isAdjustableDirectOrderLine(line: OrderLine): boolean {
    return (
      this.isDeferredDirectProduct(line.productId) &&
      line.productSnapshot.productType === 'simple' &&
      line.status === 'pending' &&
      !line.kitchenNote &&
      !line.note &&
      line.selectedModifiers.length === 0 &&
      (line.selectedComboSlots?.length ?? 0) === 0 &&
      (line.platterComponents?.length ?? 0) === 0
    );
  }

  private findSelectedOrderLineById(lineId: string): OrderLine | null {
    return this.store.selectedOrder()?.lines.find((line) => line.id === lineId) ?? null;
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
    // Solo las líneas confirmadas por el backend (remote) tienen id válido para la API;
    // una línea local aún no sincronizada no debe generar PATCH/DELETE ni refrescos que la pisen.
    if (!line?.remote) return null;
    return { line, orderId: order.id, restaurantId: restaurant.id };
  }

  private autoServeStaleKitchenLines(restaurantId: string, tableId: string, order: TableOrder): void {
    const staleLineIds = order.lines
      .filter((line) => this.isStaleKitchenLine(line))
      .map((line) => line.id);

    if (staleLineIds.length === 0) {
      return;
    }

    staleLineIds.forEach((lineId) => {
      this.api.updateRestaurantOrderLineStatus(restaurantId, order.id!, lineId, 'served').subscribe({
        next: (updatedOrder) => {
          this.store.hydrateServicePointOrder(tableId, mapRestaurantOrder(updatedOrder, this.store.selectedOrder()?.paymentMethod));
          this.store.markOrderLineServed(tableId, lineId);
        },
        error: () => undefined,
      });
    });
  }

  private isStaleKitchenLine(line: OrderLine): boolean {
    if (line.status !== 'sent_to_kitchen' && line.status !== 'preparing' && line.status !== 'ready') {
      return false;
    }

    const lastUpdatedAt = line.statusUpdatedAt ?? line.sentToKitchenAt ?? line.preparingAt ?? line.readyAt;
    return !!lastUpdatedAt && Date.now() - new Date(lastUpdatedAt).getTime() >= 24 * 60 * 60 * 1000;
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
