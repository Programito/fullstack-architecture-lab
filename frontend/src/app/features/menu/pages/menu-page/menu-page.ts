import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Badge, type BadgeVariant } from '../../../../shared/ui/badge/badge';
import { SearchInput } from '../../../../shared/ui/search-input/search-input';
import { Select, type SelectOption } from '../../../../shared/ui/select/select';
import { SegmentedControl, type SegmentedControlOption } from '../../../../shared/ui/segmented-control/segmented-control';
import type { ModifierGroup, Product } from '../../models/menu.models';
import { MenuMockService } from '../../services/menu-mock.service';
import { MenuPricingService } from '../../services/menu-pricing.service';

type AvailabilityFilter = 'all' | 'available' | 'sold-out';
type CustomizationFilter = 'all' | 'customizable' | 'simple';
type MenuPageTab = 'products' | 'categories' | 'modifiers' | 'combos' | 'platters' | 'availability';
type PreparationRoute = Product['preparationPolicy']['route'];

@Component({
  selector: 'app-menu-page',
  imports: [Badge, CurrencyPipe, SearchInput, Select, SegmentedControl, TranslocoPipe],
  templateUrl: './menu-page.html',
})
export class MenuPage {
  private readonly menu = inject(MenuMockService);
  private readonly pricing = inject(MenuPricingService);
  private readonly transloco = inject(TranslocoService);
  protected readonly query = signal('');
  protected readonly categoryFilter = signal('all');
  protected readonly availabilityFilter = signal<AvailabilityFilter>('all');
  protected readonly customizationFilter = signal<CustomizationFilter>('all');
  protected readonly activeTab = signal<MenuPageTab>('products');
  protected readonly selectedProductId = signal<string | null>(null);
  protected readonly selectedOptionIds = signal<string[]>([]);

  protected readonly categories = this.menu.categories;
  protected readonly modifierGroups = this.menu.modifierGroups;
  protected readonly products = this.menu.products;
  protected readonly comboDefinitions = this.menu.comboProductDefinitions;
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
    return product ? this.pricing.getModifierGroupsForProduct(product) : [];
  });
  protected readonly selectedModifiers = computed(() => {
    const product = this.selectedProduct();
    return product ? this.pricing.buildSelectedModifiers(product, this.selectedOptionIds()) : [];
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
    return this.pricing.getModifierGroupsForProduct(product).map((group) => group.name).join(', ');
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
      .getModifierGroupsForProduct(product)
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
      .replace(/[\u0300-\u036f]/g, '');
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
