import { CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject, forkJoin, map, switchMap } from 'rxjs';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Badge, type BadgeVariant } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Input } from '../../../../shared/ui/input/input';
import { SearchInput } from '../../../../shared/ui/search-input/search-input';
import type { SelectOption } from '../../../../shared/ui/select/select';
import { SegmentedControl, type SegmentedControlOption } from '../../../../shared/ui/segmented-control/segmented-control';
import { Switch } from '../../../../shared/ui/switch/switch';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { ProductFormDialog } from '../../components/product-form-dialog/product-form-dialog';
import type { ComboProductDefinition, MenuCategory, ModifierGroup, Product } from '../../models/menu.models';
import type { CreateProductInput, UpdateProductInput } from '../../models/product.model';
import { mapHttpError } from '../../../../core/errors/http-error.mapper';
import { ToastService } from '../../../../shared/ui/toast/toast';
import { MenuApiService, type MenuData, type RestaurantProductDetailDto, type RestaurantProductSummaryDto } from '../../services/menu-api.service';
import { MenuPricingService } from '../../services/menu-pricing.service';

type AvailabilityFilter = 'all' | 'available' | 'sold-out';
type CustomizationFilter = 'all' | 'customizable' | 'simple';
type MenuPageTab = 'products' | 'categories' | 'modifiers' | 'combos' | 'platters' | 'availability';
type PreparationRoute = Product['preparationPolicy']['route'];

@Component({
  selector: 'app-menu-page',
  imports: [Badge, Button, CurrencyPipe, Dialog, Icon, Input, NgTemplateOutlet, ProductFormDialog, SearchInput, SegmentedControl, Spinner, Switch, TranslocoPipe],
  templateUrl: './menu-page.html',
})
export class MenuPage {
  private readonly menuApi = inject(MenuApiService);
  private readonly pricing = inject(MenuPricingService);
  private readonly transloco = inject(TranslocoService);
  private readonly bp = inject(BreakpointObserver);
  private readonly toast = inject(ToastService);

  private readonly reloadTrigger = new BehaviorSubject<void>(undefined);
  private readonly _menuLoading = signal(true);
  private readonly _menuError = signal<unknown>(null);
  private readonly _menuData = signal<MenuData | undefined>(undefined);
  private readonly _catalogProducts = signal<RestaurantProductSummaryDto[]>([]);

  protected readonly menuLoading = this._menuLoading.asReadonly();
  protected readonly menuError = this._menuError.asReadonly();
  protected readonly menuId = computed(() => this._menuData()?.menuId ?? '');
  protected readonly categories = computed<MenuCategory[]>(() => this._menuData()?.categories ?? []);
  protected readonly modifierGroups = computed<ModifierGroup[]>(() => this._menuData()?.modifierGroups ?? []);
  protected readonly products = computed<Product[]>(() => {
    const menuProducts = this._menuData()?.products ?? [];
    const catalogSummaries = this._catalogProducts();

    if (!catalogSummaries.length) return menuProducts;

    const menuProductIds = new Set(
      menuProducts.map((p) => p.restaurantProductId).filter((id): id is string => !!id),
    );

    const catalogOnly = catalogSummaries
      .filter((cp) => !menuProductIds.has(cp.id))
      .map(mapSummaryToProduct);

    return [...menuProducts, ...catalogOnly];
  });
  protected readonly comboDefinitions = computed<ComboProductDefinition[]>(() => this._menuData()?.comboProductDefinitions ?? []);

  constructor() {
    this.reloadTrigger.pipe(
      switchMap(() =>
        forkJoin({
          menuData: this.menuApi.getMenu(),
          catalogProducts: this.menuApi.listProducts(),
        }),
      ),
      takeUntilDestroyed(),
    ).subscribe({
      next: ({ menuData, catalogProducts }) => {
        this._menuData.set(menuData);
        this._catalogProducts.set(catalogProducts);
        this._menuLoading.set(false);
      },
      error: (err) => {
        this._menuError.set(err);
        this._menuLoading.set(false);
      },
    });
  }

  protected readonly createSectionOpen = signal(false);
  protected readonly newSectionName = signal('');
  protected readonly sectionToDelete = signal<MenuCategory | null>(null);
  protected readonly deleteSectionOpen = signal(false);

  protected readonly productFormOpen = signal(false);
  protected readonly productFormProduct = signal<RestaurantProductDetailDto | null>(null);
  protected readonly productFormLoading = signal(false);
  protected readonly productToDelete = signal<Product | null>(null);
  protected readonly deleteProductOpen = signal(false);
  protected readonly deleteProductLoading = signal(false);
  protected readonly addToSectionProduct = signal<Product | null>(null);
  protected readonly addToSectionOpen = signal(false);
  protected readonly addToSectionLoading = signal(false);

  protected readonly isMobile = toSignal(
    this.bp.observe('(max-width: 1023px)').pipe(map((r) => r.matches)),
    { initialValue: false },
  );
  protected readonly query = signal('');
  protected readonly categoryFilter = signal('all');
  protected readonly availabilityFilter = signal<AvailabilityFilter>('all');
  protected readonly customizationFilter = signal<CustomizationFilter>('all');
  protected readonly activeTab = signal<MenuPageTab>('products');
  protected readonly selectedProductId = signal<string | null>(null);
  protected readonly selectedOptionIds = signal<string[]>([]);
  protected readonly mobileDetailOpen = signal(false);
  protected readonly mobileDetailTitle = computed(() => this.selectedProduct()?.name ?? '');
  protected readonly categorySelectorOpen = signal(false);
  protected readonly categorySelectorQuery = signal('');
  protected readonly currentCategoryLabel = computed(
    () => this.categoryOptions().find((opt) => opt.value === this.categoryFilter())?.label ?? '',
  );
  protected readonly filteredCategoryOptions = computed(() => {
    const q = this.normalize(this.categorySelectorQuery());
    if (!q) return this.categoryOptions();
    return this.categoryOptions().filter((opt) => this.normalize(opt.label).includes(q));
  });

  protected readonly availableCount = computed(() => this.products().filter((product) => product.available).length);
  protected readonly customizableCount = computed(() => this.products().filter((product) => product.modifierGroupIds.length > 0).length);
  protected readonly menuTabOptions = computed<SegmentedControlOption[]>(() => [
    { label: this.translate('menu.page.tabs.products'), value: 'products' },
    { label: this.translate('menu.page.tabs.categories'), value: 'categories' },
    { label: this.translate('menu.page.tabs.modifiers'), value: 'modifiers' },
    { label: this.translate('menu.page.tabs.combos'), value: 'combos' },
    { label: this.translate('menu.page.tabs.platters'), value: 'platters' },
    { label: this.translate('menu.page.tabs.availability'), value: 'availability' },
  ]);
  protected readonly categoryOptions = computed<SelectOption[]>(() => [
    { label: this.translate('menu.page.allCategories'), value: 'all' },
    ...this.categories().map((category) => ({ label: category.name, value: category.id })),
  ]);
  protected readonly availabilityOptions = computed<SegmentedControlOption[]>(() => [
    { label: this.translate('menu.page.availabilityAll'), value: 'all' },
    { label: this.translate('menu.page.availabilityAvailable'), value: 'available' },
    { label: this.translate('menu.page.availabilitySoldOut'), value: 'sold-out' },
  ]);
  protected readonly customizationOptions = computed<SegmentedControlOption[]>(() => [
    { label: this.translate('menu.page.customizationAll'), value: 'all' },
    { label: this.translate('menu.page.customizationCustomizable'), value: 'customizable' },
    { label: this.translate('menu.page.customizationSimple'), value: 'simple' },
  ]);
  protected readonly filteredProducts = computed(() => {
    const query = this.normalize(this.query());
    const categoryFilter = this.categoryFilter();
    const availabilityFilter = this.availabilityFilter();
    const customizationFilter = this.customizationFilter();

    return this.products()
      .filter((product) => categoryFilter === 'all' || product.categoryId === categoryFilter)
      .filter((product) => availabilityFilter === 'all' || (availabilityFilter === 'available' ? product.available : !product.available))
      .filter((product) => customizationFilter === 'all' || (customizationFilter === 'customizable' ? this.isCustomizable(product) : this.isSimple(product)))
      .filter((product) => !query || this.productSearchText(product).includes(query));
  });
  protected readonly comboProducts = computed(() => this.products().filter((product) => product.type === 'combo'));
  protected readonly platterProducts = computed(() => this.products().filter((product) => product.type === 'platter'));
  protected readonly unavailableProducts = computed(() => this.products().filter((product) => !product.available));
  protected readonly availableProducts = computed(() => this.products().filter((product) => product.available));
  protected readonly selectedProduct = computed(() => {
    const selectedProductId = this.selectedProductId();
    const visibleProducts = this.filteredProducts();

    return (
      (selectedProductId ? visibleProducts.find((product) => product.id === selectedProductId) : null) ??
      visibleProducts[0] ??
      null
    );
  });
  protected readonly selectedModifierGroups = computed(() => {
    const product = this.selectedProduct();
    return product ? this.pricing.getModifierGroupsForProduct(product, this.modifierGroups()) : [];
  });
  protected readonly selectedModifiers = computed(() => {
    const product = this.selectedProduct();
    return product ? this.pricing.buildSelectedModifiers(product, this.selectedOptionIds(), this.modifierGroups()) : [];
  });
  protected readonly previewPrice = computed(() => {
    const product = this.selectedProduct();
    return product ? this.pricing.calculateCustomizedProductPrice(product, this.selectedModifiers()) : 0;
  });

  protected updateQuery(query: string): void {
    this.query.set(query);
  }

  protected setActiveTab(value: string): void {
    if (this.isMenuPageTab(value)) {
      this.activeTab.set(value);
    }
  }

  protected selectProduct(product: Product): void {
    this.selectedProductId.set(product.id);
    this.selectedOptionIds.set(this.defaultOptionIds(product));
  }

  protected handleProductClick(product: Product): void {
    this.selectProduct(product);
    if (this.isMobile()) this.mobileDetailOpen.set(true);
  }

  protected closeMobileDetail(): void {
    this.mobileDetailOpen.set(false);
  }

  protected selectCategory(value: string): void {
    this.setCategoryFilter(value);
    this.categorySelectorOpen.set(false);
    this.categorySelectorQuery.set('');
  }

  protected closeCategorySelector(): void {
    this.categorySelectorOpen.set(false);
    this.categorySelectorQuery.set('');
  }

  protected openCreateSection(): void {
    this.newSectionName.set('');
    this.createSectionOpen.set(true);
  }

  protected cancelCreateSection(): void {
    this.createSectionOpen.set(false);
    this.newSectionName.set('');
  }

  protected submitCreateSection(): void {
    const name = this.newSectionName().trim();
    if (!name) return;
    this.menuApi.createSection(this.menuId(), name, true).subscribe({
      complete: () => {
        this.createSectionOpen.set(false);
        this.newSectionName.set('');
        this.reloadMenuData();
      },
    });
  }

  protected toggleSectionVisibility(category: MenuCategory): void {
    this.menuApi.updateSection(this.menuId(), category.id, { isVisible: !category.isVisible }).subscribe({
      complete: () => this.reloadMenuData(),
    });
  }

  protected openDeleteSection(category: MenuCategory): void {
    this.sectionToDelete.set(category);
    this.deleteSectionOpen.set(true);
  }

  protected cancelDeleteSection(): void {
    this.deleteSectionOpen.set(false);
    this.sectionToDelete.set(null);
  }

  protected confirmDeleteSection(): void {
    const category = this.sectionToDelete();
    if (!category) return;
    this.menuApi.deleteSection(this.menuId(), category.id).subscribe({
      complete: () => {
        this.deleteSectionOpen.set(false);
        this.sectionToDelete.set(null);
        this.reloadMenuData();
      },
    });
  }

  protected openCreateProduct(): void {
    this.productFormProduct.set(null);
    this.productFormOpen.set(true);
  }

  protected openEditProduct(product: Product): void {
    if (!product.restaurantProductId) return;
    this.menuApi.getProduct(product.restaurantProductId).subscribe({
      next: (detail) => {
        this.productFormProduct.set(detail);
        this.productFormOpen.set(true);
      },
    });
  }

  protected closeProductForm(): void {
    this.productFormOpen.set(false);
    this.productFormProduct.set(null);
  }

  protected submitProductForm(input: CreateProductInput | UpdateProductInput): void {
    this.productFormLoading.set(true);
    const isEdit = this.productFormProduct() !== null;
    const product = this.productFormProduct();
    const req$ = product
      ? this.menuApi.updateProduct(product.id, input as UpdateProductInput)
      : this.menuApi.createProduct(input as CreateProductInput);
    req$.subscribe({
      complete: () => {
        this.productFormLoading.set(false);
        this.productFormOpen.set(false);
        this.productFormProduct.set(null);
        this.reloadMenuData();
        this.toast.success({ title: this.translate(isEdit ? 'menu.product.success.updated' : 'menu.product.success.created') });
      },
      error: (err) => {
        this.productFormLoading.set(false);
        const appError = mapHttpError(err);
        const key = appError.type === 'conflict'
          ? 'menu.product.errors.nameTaken'
          : 'menu.product.errors.saveFailed';
        this.toast.danger({ title: this.translate(key) });
      },
    });
  }

  protected openDeleteProduct(product: Product): void {
    this.productToDelete.set(product);
    this.deleteProductOpen.set(true);
  }

  protected cancelDeleteProduct(): void {
    this.deleteProductOpen.set(false);
    this.productToDelete.set(null);
  }

  protected confirmDeleteProduct(): void {
    const product = this.productToDelete();
    if (!product?.restaurantProductId) return;
    this.deleteProductLoading.set(true);
    this.menuApi.deleteProduct(product.restaurantProductId).subscribe({
      complete: () => {
        this.deleteProductLoading.set(false);
        this.deleteProductOpen.set(false);
        this.productToDelete.set(null);
        this.reloadMenuData();
        this.toast.success({ title: this.translate('menu.product.success.deleted') });
      },
      error: () => {
        this.deleteProductLoading.set(false);
        this.toast.danger({ title: this.translate('menu.product.errors.deleteFailed') });
      },
    });
  }

  protected isCatalogOnly(product: Product): boolean {
    return !product.categoryId;
  }

  protected openAddToSection(product: Product): void {
    this.addToSectionProduct.set(product);
    this.addToSectionOpen.set(true);
  }

  protected cancelAddToSection(): void {
    this.addToSectionOpen.set(false);
    this.addToSectionProduct.set(null);
  }

  protected confirmAddToSection(sectionId: string): void {
    const product = this.addToSectionProduct();
    if (!product?.restaurantProductId) return;
    this.addToSectionLoading.set(true);
    this.menuApi.addSectionItem(this.menuId(), sectionId, product.restaurantProductId).subscribe({
      complete: () => {
        this.addToSectionLoading.set(false);
        this.addToSectionOpen.set(false);
        this.addToSectionProduct.set(null);
        this.reloadMenuData();
        this.toast.success({ title: this.translate('menu.product.success.addedToSection') });
      },
      error: (err) => {
        this.addToSectionLoading.set(false);
        const appError = mapHttpError(err);
        const key = appError.type === 'conflict'
          ? 'menu.product.errors.alreadyInSection'
          : 'menu.product.errors.addToSectionFailed';
        this.toast.danger({ title: this.translate(key) });
      },
    });
  }

  protected toggleAvailability(product: Product): void {
    if (!product.restaurantProductId) return;
    this.menuApi.toggleAvailability(product.restaurantProductId, !product.available).subscribe({
      complete: () => this.reloadMenuData(),
    });
  }

  private reloadMenuData(): void {
    this._menuLoading.set(true);
    this.reloadTrigger.next();
  }

  protected setCategoryFilter(value: string): void {
    this.categoryFilter.set(value);
    this.resetSelection();
  }

  protected setAvailabilityFilter(value: string): void {
    if (value === 'all' || value === 'available' || value === 'sold-out') {
      this.availabilityFilter.set(value);
      this.resetSelection();
    }
  }

  protected setCustomizationFilter(value: string): void {
    if (value === 'all' || value === 'customizable' || value === 'simple') {
      this.customizationFilter.set(value);
      this.resetSelection();
    }
  }

  protected isSelected(product: Product): boolean {
    return this.selectedProduct()?.id === product.id;
  }

  protected isCustomizable(product: Product): boolean {
    return product.modifierGroupIds.length > 0;
  }

  protected isCombo(product: Product): boolean {
    return product.type === 'combo';
  }

  protected isPlatter(product: Product): boolean {
    return product.type === 'platter';
  }

  protected isSimple(product: Product): boolean {
    return product.type === 'simple' && !this.isCustomizable(product);
  }

  protected productTypeLabel(product: Product): string {
    if (this.isCombo(product)) {
      return this.translate('menu.page.productTypes.combo');
    }

    if (this.isPlatter(product)) {
      return this.translate('menu.page.productTypes.platter');
    }

    return this.isCustomizable(product)
      ? this.translate('menu.page.productTypes.customizable')
      : this.translate('menu.page.productTypes.simple');
  }

  protected productTypeVariant(product: Product): BadgeVariant {
    if (this.isCombo(product)) {
      return 'violet';
    }

    if (this.isPlatter(product)) {
      return 'success';
    }

    return this.isCustomizable(product) ? 'secondary' : 'neutral';
  }

  protected availabilityLabel(product: Product): string {
    return product.available ? this.translate('menu.page.availabilityAvailable') : this.translate('menu.page.soldOut');
  }

  protected preparationRouteLabel(product: Product): string {
    return this.translate(`menu.page.preparationRoutes.${this.preparationRouteKey(product.preparationPolicy.route)}`);
  }

  protected categoryProductCount(categoryId: string): number {
    return this.products().filter((product) => product.categoryId === categoryId).length;
  }

  protected childCategories(categoryId: string): string {
    return this.categories()
      .filter((category) => category.parentId === categoryId)
      .map((category) => category.name)
      .join(', ');
  }

  protected comboSlotCount(product: Product): number {
    return this.comboDefinitions().find((definition) => definition.productId === product.id)?.slots.length ?? 0;
  }

  protected categoryName(product: Product): string {
    return this.categories().find((category) => category.id === product.categoryId)?.name ?? product.category ?? product.categoryId;
  }

  protected modifierGroupNames(product: Product): string {
    return this.pricing.getModifierGroupsForProduct(product, this.modifierGroups()).map((group) => group.name).join(', ');
  }

  protected isOptionSelected(optionId: string): boolean {
    return this.selectedOptionIds().includes(optionId);
  }

  protected selectSingle(group: ModifierGroup, optionId: string): void {
    const groupOptionIds = new Set(group.options.map((option) => option.id));
    this.selectedOptionIds.update((selectedIds) => [...selectedIds.filter((selectedId) => !groupOptionIds.has(selectedId)), optionId]);
  }

  protected toggleOption(optionId: string): void {
    this.selectedOptionIds.update((selectedIds) =>
      selectedIds.includes(optionId) ? selectedIds.filter((selectedId) => selectedId !== optionId) : [...selectedIds, optionId],
    );
  }

  private resetSelection(): void {
    this.selectedProductId.set(null);
    this.selectedOptionIds.set([]);
  }

  private defaultOptionIds(product: Product): string[] {
    return this.pricing
      .getModifierGroupsForProduct(product, this.modifierGroups())
      .flatMap((group) => group.options.filter((option) => option.selectedByDefault).map((option) => option.id));
  }

  private productSearchText(product: Product): string {
    return this.normalize(
      [
        product.name,
        product.description,
        this.categoryName(product),
        product.course,
        product.type,
        this.productTypeLabel(product),
        this.preparationRouteLabel(product),
        ...(product.allergens ?? []),
        this.modifierGroupNames(product),
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  private translate(key: string): string {
    return this.transloco.translate(key);
  }

  private isMenuPageTab(value: string): value is MenuPageTab {
    return value === 'products' || value === 'categories' || value === 'modifiers' || value === 'combos' || value === 'platters' || value === 'availability';
  }

  private preparationRouteKey(route: PreparationRoute): string {
    return route === 'cold_station' ? 'cold' : route === 'dessert_station' ? 'dessert' : route;
  }
}

function mapSummaryToProduct(cp: RestaurantProductSummaryDto): Product {
  return {
    id: cp.id,
    restaurantProductId: cp.id,
    name: cp.displayName ?? cp.name,
    categoryId: '',
    basePrice: cp.priceCents / 100,
    price: cp.priceCents / 100,
    available: cp.isAvailable,
    allergens: [],
    course: cp.course,
    type: cp.productType as Product['type'],
    modifierGroupIds: [],
    preparationPolicy: {
      route: cp.preparationRoute,
      requiresReadyBeforeServe: cp.preparationRoute !== 'bar' && cp.preparationRoute !== 'direct',
    },
  };
}
