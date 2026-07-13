import { CurrencyPipe, LowerCasePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, filter, forkJoin, map, of, retry, switchMap, type Observable } from 'rxjs';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Badge, type BadgeVariant } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Input } from '../../../../shared/ui/input/input';
import { NearEndDirective } from '../../../../shared/ui/near-end/near-end.directive';
import { ReorderList, type ReorderListEvent, type ReorderListItem } from '../../../../shared/ui/reorder-list/reorder-list';
import { SearchInput } from '../../../../shared/ui/search-input/search-input';
import type { SelectOption } from '../../../../shared/ui/select/select';
import { SegmentedControl, type SegmentedControlOption } from '../../../../shared/ui/segmented-control/segmented-control';
import { Switch } from '../../../../shared/ui/switch/switch';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { MenuHealthPanel } from '../../components/menu-health-panel/menu-health-panel';
import { MobileMenuPreview, type MobileMenuPreviewProductsReorder, type MobileMenuPreviewSection } from '../../components/mobile-menu-preview/mobile-menu-preview';
import { ALLERGEN_VALUES } from '../../models/allergen.model';
import type { MenuAuditFilter, MenuAuditWarningType } from '../../models/menu-audit.model';
import { deriveModifierGroupDisplayType, type ModifierGroupDisplayType, type ModifierGroupType } from '../../models/modifier-group.model';
import type { ComboProductDefinition, MenuCategory, ModifierGroup, Product } from '../../models/menu.models';
import type { Allergen } from '../../models/product.model';
import { mapHttpError } from '../../../../core/errors/http-error.mapper';
import { ToastService } from '../../../../shared/ui/toast/toast';
import { ModifierGroupFormDialog } from '../../components/modifier-group-form-dialog/modifier-group-form-dialog';
import { MenuAuditService } from '../../services/menu-audit.service';
import { MenuPricingService } from '../../services/menu-pricing.service';
import { RestaurantContextStore } from '../../../restaurant-pos/state/restaurant-context.store';
import { MenuApiService, type CreateModifierGroupRequest, type MenuData, type RestaurantProductSummaryDto } from '../../services/menu-api.service';

type AvailabilityFilter = 'all' | 'available' | 'sold-out';
type CustomizationFilter = 'all' | 'customizable' | 'simple';
type ReviewFilter = 'combo-only' | 'customizable-only' | 'with-image' | 'without-image' | 'no-section' | 'missing-description';
type ProductViewMode = 'cards' | 'compact';
type MenuPageTab = 'products' | 'categories' | 'modifiers' | 'combos' | 'platters' | 'availability';
type PreparationRoute = Product['preparationPolicy']['route'];

@Component({
  selector: 'app-menu-page',
  imports: [Badge, Button, CurrencyPipe, Dialog, Icon, Input, LowerCasePipe, MenuHealthPanel, MobileMenuPreview, ModifierGroupFormDialog, NearEndDirective, NgTemplateOutlet, ReorderList, SearchInput, SegmentedControl, Spinner, Switch, TranslocoPipe],
  templateUrl: './menu-page.html',
})
export class MenuPage {
  private readonly menuApi = inject(MenuApiService);
  private readonly audit = inject(MenuAuditService);
  private readonly pricing = inject(MenuPricingService);
  private readonly transloco = inject(TranslocoService);
  private readonly bp = inject(BreakpointObserver);
  private readonly toast = inject(ToastService);
  private readonly restaurantContext = inject(RestaurantContextStore);
  private readonly router = inject(Router);

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
  private readonly modifierGroupTypeOrder: readonly ModifierGroupType[] = ['single', 'multiple', 'remove'];
  protected readonly modifierGroupSections = computed(() => {
    const groups = this.sharedModifierGroups();
    return this.modifierGroupTypeOrder
      .map((type) => ({ type, groups: groups.filter((group) => group.type === type) }))
      .filter((section) => section.groups.length > 0);
  });

  private readonly modifierSectionIcons: Record<ModifierGroupType, string> = {
    single: 'radio_button_checked',
    multiple: 'checklist',
    remove: 'remove_circle',
  };

  private readonly modifierSectionAccentClasses: Record<ModifierGroupType, string> = {
    single: 'border-l-4 border-l-cyan-500',
    multiple: 'border-l-4 border-l-violet-500',
    remove: 'border-l-4 border-l-amber-500',
  };

  protected modifierSectionIcon(type: ModifierGroupType): string {
    return this.modifierSectionIcons[type];
  }

  protected modifierSectionAccentClass(type: ModifierGroupType): string {
    return this.modifierSectionAccentClasses[type];
  }
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

  // Grupos de modificadores "compartidos" (catálogo, pestaña Modificadores). Se piden aparte de
  // this.modifierGroups() porque ese último solo trae los grupos ya enlazados a algún producto
  // del menú (necesarios para el pricing), mientras que aquí necesitamos también los grupos
  // compartidos sin enlazar todavía, y necesitamos excluir los suplementos privados de producto.
  private readonly _sharedModifierGroups = signal<ModifierGroup[]>([]);
  protected readonly sharedModifierGroups = this._sharedModifierGroups.asReadonly();

  constructor() {
    combineLatest([this.reloadTrigger, toObservable(this.restaurantContext.activeRestaurant)]).pipe(
      filter(([, activeRestaurant]) => activeRestaurant !== null),
      switchMap(() =>
        forkJoin({
          menuData: this.menuApi.getMenu(),
          catalogProducts: this.menuApi.listProducts(),
          sharedModifierGroups: this.menuApi.listModifierGroups('shared'),
        }).pipe(
          // El backend/base de datos puede tardar en despertar (arranque en frío): reintentar
          // unas veces con pausa antes de dar el error por definitivo.
          retry({ count: 3, delay: 1500 }),
          map((result) => ({ ok: true as const, result })),
          // Capturar el error AQUÍ (dentro del switchMap) mantiene vivo el stream exterior:
          // si llegara al subscribe, la suscripción moriría y "Reintentar" ya no funcionaría.
          catchError((err: unknown) => of({ ok: false as const, err })),
        ),
      ),
      takeUntilDestroyed(),
    ).subscribe((outcome) => {
      if (outcome.ok) {
        this._menuError.set(null);
        this._menuData.set(outcome.result.menuData);
        this._catalogProducts.set(outcome.result.catalogProducts);
        this._sharedModifierGroups.set(outcome.result.sharedModifierGroups);
      } else {
        this._menuError.set(outcome.err);
      }
      this._menuLoading.set(false);
    });
  }

  // Si la carga de restaurantes falló en el shell (p. ej. base de datos dormida al entrar
  // directamente por URL), esta sección se quedaba con el spinner para siempre: nadie volvía a
  // pedir los restaurantes y sin restaurante activo nunca se dispara la carga de la carta.
  // Exponer ese error permite mostrar un estado de error con botón de reintento en vez del
  // spinner. El `?.()` tolera los mocks de test del contexto que no definen `loadError`.
  protected readonly contextLoadError = computed(() => this.restaurantContext.loadError?.() ?? null);

  protected retryLoadMenu(): void {
    this._menuError.set(null);
    // Reintenta también la lista de restaurantes por si fue esa la petición que falló; cuando
    // llegue el restaurante activo, el combineLatest del constructor recargará la carta.
    this.restaurantContext.load();
    this.reloadMenuData();
  }

  protected readonly createSectionOpen = signal(false);
  protected readonly newSectionName = signal('');
  // Nombres opcionales en catalan/ingles para la nueva seccion, junto al nombre canonico
  // en castellano. Ver docs/superpowers/plans/2026-07-11-menu-multilingual-names.md.
  protected readonly newSectionNameCa = signal('');
  protected readonly newSectionNameEn = signal('');
  protected readonly sectionToDelete = signal<MenuCategory | null>(null);
  protected readonly deleteSectionOpen = signal(false);

  // Editar nombre (ES/CA/EN) de una sección ya creada — antes solo se podía crear, nunca editar.
  // Ver docs/superpowers/plans/2026-07-11-menu-multilingual-names.md, Fase 2 Paso 3.
  protected readonly editSectionOpen = signal(false);
  protected readonly editSectionCategory = signal<MenuCategory | null>(null);
  protected readonly editSectionName = signal('');
  protected readonly editSectionNameCa = signal('');
  protected readonly editSectionNameEn = signal('');
  protected readonly editSectionLoading = signal(false);

  protected readonly productToDelete = signal<Product | null>(null);
  protected readonly deleteProductOpen = signal(false);
  protected readonly deleteProductLoading = signal(false);
  protected readonly addToSectionProduct = signal<Product | null>(null);
  protected readonly addToSectionOpen = signal(false);
  protected readonly addToSectionLoading = signal(false);
  protected readonly modifierGroupFormOpen = signal(false);
  protected readonly modifierGroupFormLoading = signal(false);
  // Grupo en edición (null = el diálogo está en modo creación). Ver nota de Fase 2 Paso 3 del
  // plan multiidioma: antes el diálogo solo servía para crear, nunca para editar uno existente.
  protected readonly modifierGroupToEdit = signal<ModifierGroup | null>(null);
  protected readonly modifierGroupToDelete = signal<ModifierGroup | null>(null);
  protected readonly deleteModifierGroupOpen = signal(false);
  protected readonly deleteModifierGroupLoading = signal(false);

  protected readonly isMobile = toSignal(
    this.bp.observe('(max-width: 1023px)').pipe(map((r) => r.matches)),
    { initialValue: false },
  );
  protected readonly showSideDetail = toSignal(
    // 1024px en vez de 900px: en tablet el panel lateral de 24rem dejaba la rejilla en una
    // columna estrecha; por debajo de lg se usa el diálogo de detalle, mucho más cómodo.
    this.bp.observe('(min-width: 1024px)').pipe(map((r) => r.matches)),
    { initialValue: true },
  );
  protected readonly query = signal('');
  protected readonly categoryFilter = signal('all');
  protected readonly availabilityFilter = signal<AvailabilityFilter>('all');
  protected readonly customizationFilter = signal<CustomizationFilter>('all');
  protected readonly selectedAllergenFilters = signal<Allergen[]>([]);
  protected readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.categoryFilter() !== 'all') count++;
    if (this.availabilityFilter() !== 'all') count++;
    if (this.customizationFilter() !== 'all') count++;
    count += this.selectedAllergenFilters().length;
    return count;
  });
  protected readonly auditFilter = signal<MenuAuditFilter>('all');
  protected readonly reviewPanelOpen = signal(false);
  protected readonly reviewFilters = signal<ReviewFilter[]>([]);
  // En pantallas pequeñas la vista compacta es mucho más densa que las cards a una columna,
  // así que es la predeterminada en móvil; el usuario puede cambiarla cuando quiera.
  protected readonly productViewMode = signal<ProductViewMode>(
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 639px)').matches
      ? 'compact'
      : 'cards',
  );
  protected readonly activeTab = signal<MenuPageTab>('products');
  protected readonly selectedProductId = signal<string | null>(null);
  protected readonly selectedOptionIds = signal<string[]>([]);
  protected readonly mobileDetailOpen = signal(false);
  protected readonly mobileDetailTitle = computed(() => this.selectedProduct()?.name ?? '');
  protected readonly mobileFiltersOpen = signal(false);
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
  protected readonly allergenFilterOptions = computed(() =>
    ALLERGEN_VALUES.map((value) => ({
      value,
      label: this.translate(`menu.allergen.${value}`),
    })),
  );
  protected readonly productViewModeOptions = computed<SegmentedControlOption[]>(() => [
    { label: this.translate('menu.page.viewModes.cards'), value: 'cards' },
    { label: this.translate('menu.page.viewModes.compact'), value: 'compact' },
  ]);
  protected readonly reviewFilterOptions = computed<Array<{ value: ReviewFilter; label: string }>>(() => [
    { value: 'combo-only', label: this.translate('menu.page.reviewFilters.comboOnly') },
    { value: 'customizable-only', label: this.translate('menu.page.reviewFilters.customizableOnly') },
    { value: 'with-image', label: this.translate('menu.page.reviewFilters.withImage') },
    { value: 'without-image', label: this.translate('menu.page.reviewFilters.withoutImage') },
    { value: 'no-section', label: this.translate('menu.page.reviewFilters.noSection') },
    { value: 'missing-description', label: this.translate('menu.page.reviewFilters.missingDescription') },
  ]);
  protected readonly auditReport = computed(() => this.audit.buildReport(this.products(), this.modifierGroups(), this.comboDefinitions()));
  protected readonly auditCounters = computed(() => this.auditReport().counters);
  protected readonly activeWarningCount = computed(() => this.auditCounters().reduce((sum, c) => sum + c.count, 0));
  protected readonly productsWithAuditIssues = computed(
    () => Object.values(this.auditReport().warningsByProductId).filter((warnings) => warnings.length > 0).length,
  );
  protected readonly auditSeverity = computed<'danger' | 'warning' | 'neutral'>(() => {
    if (this.auditCounters().length === 0) {
      return 'neutral';
    }
    return this.auditCounters().some((counter) => counter.priority === 'high') ? 'danger' : 'warning';
  });
  protected readonly filteredProducts = computed(() => {
    const query = this.normalize(this.query());
    const categoryFilter = this.categoryFilter();
    const availabilityFilter = this.availabilityFilter();
    const customizationFilter = this.customizationFilter();
    const selectedAllergenFilters = this.selectedAllergenFilters();
    const auditFilter = this.auditFilter();
    const reviewFilters = this.reviewFilters();

    return this.products()
      .filter((product) => categoryFilter === 'all' || product.categoryId === categoryFilter)
      .filter((product) => availabilityFilter === 'all' || (availabilityFilter === 'available' ? product.available : !product.available))
      .filter((product) => customizationFilter === 'all' || (customizationFilter === 'customizable' ? this.isCustomizable(product) : this.isSimple(product)))
      .filter((product) => selectedAllergenFilters.length === 0 || this.matchesAllergenFilters(product, selectedAllergenFilters))
      .filter((product) => auditFilter === 'all' || this.productHasAuditWarning(product, auditFilter))
      .filter((product) => reviewFilters.every((filter) => this.matchesReviewFilter(product, filter)))
      .filter((product) => !query || this.productSearchText(product).includes(query));
  });
  // Carga progresiva: solo se renderizan los primeros `visibleProductCount` productos y el
  // centinela appNearEnd va ampliando el tramo al acercarse al final de la lista.
  private static readonly PRODUCTS_PAGE_SIZE = 24;
  protected readonly visibleProductCount = signal(MenuPage.PRODUCTS_PAGE_SIZE);
  protected readonly displayedProducts = computed(() => this.filteredProducts().slice(0, this.visibleProductCount()));
  protected readonly hasMoreProducts = computed(() => this.filteredProducts().length > this.visibleProductCount());

  protected showMoreProducts(): void {
    this.visibleProductCount.update((count) => count + MenuPage.PRODUCTS_PAGE_SIZE);
  }

  private resetVisibleProductCount(): void {
    this.visibleProductCount.set(MenuPage.PRODUCTS_PAGE_SIZE);
  }

  // Modo "Ordenar": reordenar categorías (pestaña Categorías) y productos dentro de la categoría
  // filtrada (pestaña Productos). El backend persiste el sortOrder vía los endpoints de reorder.
  protected readonly reorderModeActive = signal(false);
  protected readonly reorderSaving = signal(false);
  protected readonly canReorderProducts = computed(() => this.categoryFilter() !== 'all');
  protected readonly categoriesAsReorderItems = computed<ReorderListItem[]>(() =>
    this.categories().map((category) => ({ id: category.id, label: category.name })),
  );
  protected readonly productsInActiveCategoryAsReorderItems = computed<ReorderListItem[]>(() => {
    if (!this.canReorderProducts()) return [];
    const categoryId = this.categoryFilter();
    return this.products()
      .filter((product) => product.categoryId === categoryId)
      .map((product) => ({ id: product.id, label: product.name }));
  });

  // Vista previa de la carta tal y como la ve el cliente en la app móvil (pestaña Categorías):
  // mismas secciones visibles y mismo orden que devuelve la API, para comprobar en vivo el
  // resultado al reordenar categorías o productos.
  protected readonly categoriesPreviewSections = computed<MobileMenuPreviewSection[]>(() =>
    this.categories()
      .filter((category) => category.isVisible !== false)
      .map((category) => ({
        id: category.id,
        name: category.name,
        products: this.products()
          .filter((product) => product.categoryId === category.id)
          .map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description ?? null,
            imageUrl: product.imageUrl ?? null,
            priceEuros: product.basePrice,
            available: product.available,
            allergenLabels: (product.allergens ?? []).map((allergen) => this.toAllergenLabel(allergen)),
          })),
      })),
  );

  protected toggleReorderMode(): void {
    this.reorderModeActive.update((active) => !active);
    if (this.reorderModeActive()) {
      this.selectionModeActive.set(false);
      this.selectedProductIds.set(new Set<string>());
    }
  }

  protected handleCategoriesReordered(event: ReorderListEvent): void {
    const items = event.value.map((item, index) => ({ id: item.id, sortOrder: (index + 1) * 10 }));
    this.persistReorder(this.menuApi.reorderSections(this.menuId(), items));
  }

  protected handleProductsReordered(event: ReorderListEvent): void {
    const sectionId = this.categoryFilter();
    if (sectionId === 'all') return;
    const items = event.value.map((item, index) => ({ id: item.id, sortOrder: (index + 1) * 10 }));
    this.persistReorder(this.menuApi.reorderSectionItems(this.menuId(), sectionId, items));
  }

  // Reordenación desde la propia vista previa del móvil (drag & drop sobre la pantalla simulada).
  // Se aplica primero de forma optimista sobre _menuData para que la preview refleje el arrastre
  // al instante; persistReorder recarga después del backend (confirmando o revirtiendo).
  protected handlePreviewSectionsReordered(orderedIds: string[]): void {
    const data = this._menuData();
    if (!data) return;
    const byId = new Map(data.categories.map((category) => [category.id, category]));
    const reordered = orderedIds.map((id) => byId.get(id)).filter((category): category is MenuCategory => !!category);
    const missing = data.categories.filter((category) => !orderedIds.includes(category.id));
    this._menuData.set({ ...data, categories: [...reordered, ...missing] });
    const items = orderedIds.map((id, index) => ({ id, sortOrder: (index + 1) * 10 }));
    this.persistReorder(this.menuApi.reorderSections(this.menuId(), items));
  }

  protected handlePreviewProductsReordered(event: MobileMenuPreviewProductsReorder): void {
    const data = this._menuData();
    if (!data) return;
    const inSection = data.products.filter((product) => product.categoryId === event.sectionId);
    const others = data.products.filter((product) => product.categoryId !== event.sectionId);
    const byId = new Map(inSection.map((product) => [product.id, product]));
    const reordered = event.orderedProductIds.map((id) => byId.get(id)).filter((product): product is Product => !!product);
    const missing = inSection.filter((product) => !event.orderedProductIds.includes(product.id));
    this._menuData.set({ ...data, products: [...others, ...reordered, ...missing] });
    const items = event.orderedProductIds.map((id, index) => ({ id, sortOrder: (index + 1) * 10 }));
    this.persistReorder(this.menuApi.reorderSectionItems(this.menuId(), event.sectionId, items));
  }

  private persistReorder(request: Observable<void>): void {
    this.reorderSaving.set(true);
    request.subscribe({
      next: () => {
        this.reorderSaving.set(false);
        this.toast.success({ title: this.translate('menu.page.reorderSaved') });
        this.reloadMenuData();
      },
      error: () => {
        this.reorderSaving.set(false);
        this.toast.danger({ title: this.translate('menu.page.reorderFailed') });
        this.reloadMenuData();
      },
    });
  }

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
  protected readonly comboWithImageCount = computed(() => this.comboProducts().filter((product) => !!product.imageUrl).length);
  protected readonly withoutImageCount = computed(() => this.products().filter((product) => !product.imageUrl).length);
  protected readonly customizableComboCount = computed(
    () => this.comboProducts().filter((product) => this.isCustomizable(product)).length,
  );

  protected readonly tabSearchQuery = signal('');

  protected readonly filteredCategories = computed(() => {
    const q = this.normalize(this.tabSearchQuery());
    return q ? this.categories().filter((category) => this.normalize(category.name).includes(q)) : this.categories();
  });

  protected readonly filteredModifierGroupSections = computed(() => {
    const q = this.normalize(this.tabSearchQuery());
    if (!q) return this.modifierGroupSections();
    return this.modifierGroupSections()
      .map((section) => ({ ...section, groups: section.groups.filter((group) => this.normalize(group.name).includes(q)) }))
      .filter((section) => section.groups.length > 0);
  });

  protected readonly filteredComboProducts = computed(() => {
    const q = this.normalize(this.tabSearchQuery());
    return q ? this.comboProducts().filter((product) => this.normalize(product.name).includes(q)) : this.comboProducts();
  });

  protected readonly filteredPlatterProducts = computed(() => {
    const q = this.normalize(this.tabSearchQuery());
    return q ? this.platterProducts().filter((product) => this.normalize(product.name).includes(q)) : this.platterProducts();
  });

  protected readonly filteredAvailabilityProducts = computed(() => {
    const q = this.normalize(this.tabSearchQuery());
    return q ? this.products().filter((product) => this.normalize(product.name).includes(q)) : this.products();
  });

  protected updateQuery(query: string): void {
    this.query.set(query);
    this.resetVisibleProductCount();
  }

  protected updateTabSearchQuery(query: string): void {
    this.tabSearchQuery.set(query);
  }

  protected setActiveTab(value: string): void {
    if (this.isMenuPageTab(value)) {
      this.activeTab.set(value);
      this.tabSearchQuery.set('');
      this.resetVisibleProductCount();
      this.reorderModeActive.set(false);
      this.selectionModeActive.set(false);
      this.selectedProductIds.set(new Set<string>());
    }
  }

  protected setAuditFilter(value: MenuAuditFilter): void {
    this.auditFilter.set(value);
  }

  protected handleAuditFilterSelected(value: MenuAuditFilter): void {
    // Se queda abierto igual que los filtros manuales de abajo: ambos aplican en vivo y el
    // usuario cierra explícitamente con "Ver productos" cuando ya ve el recuento que le interesa.
    this.setAuditFilter(value);
    this.resetSelection();
  }

  protected toggleReviewFilter(filter: ReviewFilter): void {
    this.reviewFilters.update((filters) => filters.includes(filter) ? filters.filter((value) => value !== filter) : [...filters, filter]);
    this.resetSelection();
  }

  protected hasReviewFilter(filter: ReviewFilter): boolean {
    return this.reviewFilters().includes(filter);
  }

  protected readonly hasActiveReviewFilters = computed(() => this.auditFilter() !== 'all' || this.reviewFilters().length > 0);

  protected clearAllReviewFilters(): void {
    this.auditFilter.set('all');
    this.reviewFilters.set([]);
    this.resetSelection();
  }

  protected applyReviewFiltersAndClose(): void {
    this.reviewPanelOpen.set(false);
  }

  protected setProductViewMode(value: string): void {
    if (value === 'cards' || value === 'compact') {
      this.productViewMode.set(value);
    }
  }

  protected selectProduct(product: Product): void {
    this.selectedProductId.set(product.id);
    this.selectedOptionIds.set(this.defaultOptionIds(product));
  }

  protected handleProductClick(product: Product): void {
    if (this.selectionModeActive()) {
      this.toggleProductSelected(product);
      return;
    }
    this.selectProduct(product);
    if (!this.showSideDetail()) this.mobileDetailOpen.set(true);
  }

  // ── Modo selección / acciones en lote ─────────────────────────────────────
  protected readonly selectionModeActive = signal(false);
  protected readonly selectedProductIds = signal<ReadonlySet<string>>(new Set<string>());
  protected readonly batchRunning = signal(false);
  protected readonly batchMoveOpen = signal(false);
  // Vista previa móvil de la pestaña Categorías como diálogo en pantallas < lg.
  protected readonly previewDialogOpen = signal(false);
  protected readonly selectedCount = computed(() => this.selectedProductIds().size);
  private readonly selectedProducts = computed(() =>
    this.products().filter((product) => this.selectedProductIds().has(product.id)),
  );

  protected toggleSelectionMode(): void {
    const next = !this.selectionModeActive();
    this.selectionModeActive.set(next);
    this.selectedProductIds.set(new Set<string>());
    this.batchMoveOpen.set(false);
    if (next) this.reorderModeActive.set(false);
  }

  protected isProductSelected(product: Product): boolean {
    return this.selectedProductIds().has(product.id);
  }

  protected toggleProductSelected(product: Product): void {
    if (!product.restaurantProductId) return;
    this.selectedProductIds.update((current) => {
      const next = new Set(current);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        next.add(product.id);
      }
      return next;
    });
  }

  protected batchSetAvailability(available: boolean): void {
    const targets = this.selectedProducts().filter(
      (product) => !!product.restaurantProductId && product.available !== available,
    );
    if (this.batchRunning()) return;
    if (!targets.length) {
      // Nada que cambiar (ya estaban todos en ese estado): salir del modo sin llamadas.
      this.finishBatch(this.selectedCount());
      return;
    }
    this.batchRunning.set(true);
    forkJoin(targets.map((product) => this.menuApi.toggleAvailability(product.restaurantProductId!, available))).subscribe({
      next: () => this.finishBatch(targets.length),
      error: () => this.failBatch(),
    });
  }

  protected openBatchMove(): void {
    if (this.selectedCount() > 0) this.batchMoveOpen.set(true);
  }

  protected closeBatchMove(): void {
    this.batchMoveOpen.set(false);
  }

  protected confirmBatchMove(targetSectionId: string): void {
    const targets = this.selectedProducts().filter((product) => !!product.restaurantProductId);
    if (!targets.length || this.batchRunning()) return;
    this.batchRunning.set(true);
    this.batchMoveOpen.set(false);
    const menuId = this.menuId();
    const operations = targets.map((product) => {
      if (product.categoryId === targetSectionId) return of(undefined);
      const add$ = this.menuApi.addSectionItem(menuId, targetSectionId, product.restaurantProductId!);
      const isInSection = this.categories().some((category) => category.id === product.categoryId);
      // product.id es el id del ítem de sección (mapApiItemToProduct), que es lo que espera removeSectionItem.
      return isInSection ? this.menuApi.removeSectionItem(menuId, product.categoryId, product.id).pipe(switchMap(() => add$)) : add$;
    });
    forkJoin(operations).subscribe({
      next: () => this.finishBatch(targets.length),
      error: () => this.failBatch(),
    });
  }

  private finishBatch(count: number): void {
    this.batchRunning.set(false);
    this.selectionModeActive.set(false);
    this.selectedProductIds.set(new Set<string>());
    this.toast.success({ title: this.translate('menu.page.batchDone', { count }) });
    this.reloadMenuData();
  }

  private failBatch(): void {
    this.batchRunning.set(false);
    this.toast.danger({ title: this.translate('menu.page.batchFailed') });
    this.reloadMenuData();
  }

  // ── Duplicar producto (solo 'simple'; combos/platters tienen su propio flujo) ─
  protected readonly duplicatingProductId = signal<string | null>(null);

  protected canDuplicate(product: Product): boolean {
    return product.type === 'simple' && !!product.restaurantProductId;
  }

  protected duplicateProduct(product: Product): void {
    const originalId = product.restaurantProductId;
    if (!originalId || this.duplicatingProductId()) return;
    this.duplicatingProductId.set(product.id);

    forkJoin({
      detail: this.menuApi.getProduct(originalId),
      productGroups: this.menuApi.listModifierGroups('product'),
      sharedGroups: this.menuApi.listModifierGroups('shared'),
    }).pipe(
      switchMap(({ detail, productGroups, sharedGroups }) => {
        // Los grupos compartidos se reutilizan por id; los privados (suplementos) se clonan
        // después para que editar los de la copia no toque los del original.
        const sharedIds = new Set(sharedGroups.map((group) => group.id));
        const sharedOnly = detail.modifierGroupIds.filter((id) => sharedIds.has(id));
        const ownedGroups = productGroups.filter((group) => group.ownerRestaurantProductId === originalId);
        const description = detail.displayDescription ?? detail.description;
        return this.menuApi.createProduct({
          name: `${detail.displayName ?? detail.name} (copia)`,
          ...(description ? { description } : {}),
          imageUrl: detail.imageUrl,
          modifierGroupIds: sharedOnly,
          allergens: detail.allergens,
          priceCents: detail.priceCents,
          currency: detail.currency,
          course: detail.course,
          preparationRoute: detail.preparationRoute,
        }).pipe(map((copy) => ({ copy, sharedOnly, ownedGroups })));
      }),
      switchMap(({ copy, sharedOnly, ownedGroups }) => {
        if (!ownedGroups.length) return of(copy);
        return forkJoin(
          ownedGroups.map((group) =>
            this.menuApi.createModifierGroup({
              name: group.name,
              selectionType: group.type === 'multiple' ? 'multiple' : 'single',
              minSelections: group.minSelections,
              maxSelections: group.maxSelections,
              isRequired: group.required,
              options: group.options.map((option) => ({
                name: option.name,
                priceDeltaCents: Math.round(option.priceDelta * 100),
                ...(option.imageUrl ? { imageUrl: option.imageUrl } : {}),
              })),
              scope: 'product',
              ownerRestaurantProductId: copy.id,
            }),
          ),
        ).pipe(
          switchMap((created) =>
            this.menuApi.updateProduct(copy.id, { modifierGroupIds: [...sharedOnly, ...created.map((group) => group.id)] }),
          ),
          map(() => copy),
        );
      }),
      switchMap((copy) => {
        const sectionId = product.categoryId;
        const isInSection = !!sectionId && this.categories().some((category) => category.id === sectionId);
        if (!isInSection) return of(copy);
        return this.menuApi.addSectionItem(this.menuId(), sectionId, copy.id).pipe(map(() => copy));
      }),
    ).subscribe({
      next: (copy) => {
        this.duplicatingProductId.set(null);
        this.toast.success({ title: this.translate('menu.page.duplicateSuccess') });
        // Directo al editor de la copia para retocar nombre/foto al momento.
        this.router.navigateByUrl(`/restaurant-pos/menu/products/${copy.id}/edit`);
      },
      error: () => {
        this.duplicatingProductId.set(null);
        this.toast.danger({ title: this.translate('menu.page.duplicateFailed') });
        this.reloadMenuData();
      },
    });
  }

  // ── Buscador con resultados agrupados (secciones y modificadores) ──────────
  protected readonly searchMatchingCategories = computed(() => {
    const q = this.normalize(this.query());
    if (!q) return [];
    return this.categories()
      .filter((category) => this.normalize(category.name).includes(q))
      .slice(0, 5);
  });

  protected readonly searchMatchingModifierGroups = computed(() => {
    const q = this.normalize(this.query());
    if (!q) return [];
    return this.sharedModifierGroups()
      .filter(
        (group) =>
          this.normalize(group.name).includes(q) ||
          group.options.some((option) => this.normalize(option.name).includes(q)),
      )
      .slice(0, 5);
  });

  protected goToCategoryFromSearch(categoryId: string): void {
    this.setCategoryFilter(categoryId);
    this.updateQuery('');
  }

  protected goToModifierGroupFromSearch(groupName: string): void {
    this.setActiveTab('modifiers');
    this.updateTabSearchQuery(groupName);
  }

  protected closeMobileDetail(): void {
    this.mobileDetailOpen.set(false);
  }

  protected openMobileFilters(): void {
    this.mobileFiltersOpen.set(true);
  }

  protected closeMobileFilters(): void {
    this.mobileFiltersOpen.set(false);
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
    this.newSectionNameCa.set('');
    this.newSectionNameEn.set('');
    this.createSectionOpen.set(true);
  }

  protected cancelCreateSection(): void {
    this.createSectionOpen.set(false);
    this.newSectionName.set('');
    this.newSectionNameCa.set('');
    this.newSectionNameEn.set('');
  }

  protected submitCreateSection(): void {
    const name = this.newSectionName().trim();
    if (!name) return;
    const ca = this.newSectionNameCa().trim();
    const en = this.newSectionNameEn().trim();
    const nameI18n = ca || en ? { ...(ca ? { ca } : {}), ...(en ? { en } : {}) } : undefined;
    this.menuApi.createSection(this.menuId(), name, true, nameI18n).subscribe({
      complete: () => {
        this.createSectionOpen.set(false);
        this.newSectionName.set('');
        this.newSectionNameCa.set('');
        this.newSectionNameEn.set('');
        this.reloadMenuData();
      },
    });
  }

  protected openEditSection(category: MenuCategory): void {
    this.editSectionCategory.set(category);
    this.editSectionName.set(category.name);
    this.editSectionNameCa.set(category.nameI18n?.ca ?? '');
    this.editSectionNameEn.set(category.nameI18n?.en ?? '');
    this.editSectionOpen.set(true);
  }

  protected cancelEditSection(): void {
    this.editSectionOpen.set(false);
    this.editSectionCategory.set(null);
  }

  protected submitEditSection(): void {
    const category = this.editSectionCategory();
    const name = this.editSectionName().trim();
    if (!category || !name || this.editSectionLoading()) return;
    const ca = this.editSectionNameCa().trim();
    const en = this.editSectionNameEn().trim();
    const nameI18n = ca || en ? { ...(ca ? { ca } : {}), ...(en ? { en } : {}) } : undefined;

    this.editSectionLoading.set(true);
    this.menuApi.updateSection(this.menuId(), category.id, { name, nameI18n }).subscribe({
      complete: () => {
        this.editSectionLoading.set(false);
        this.editSectionOpen.set(false);
        this.editSectionCategory.set(null);
        this.reloadMenuData();
        this.toast.success({ title: this.translate('menu.page.sectionUpdated') });
      },
      error: () => {
        this.editSectionLoading.set(false);
        this.toast.danger({ title: this.translate('menu.page.sectionUpdateFailed') });
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
    this.router.navigateByUrl('/restaurant-pos/menu/products/new');
  }

  protected openEditProduct(product: Product): void {
    if (!product.restaurantProductId) return;
    this.router.navigateByUrl(`/restaurant-pos/menu/products/${product.restaurantProductId}/edit`);
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
        if (appError.code === 'menu_item_already_in_section') {
          // El listado de "solo catalogo" puede quedarse un instante desactualizado (p.ej. si el
          // producto se acaba de colocar en esa misma seccion desde el editor completo): si el
          // backend dice que ya esta ahi, el resultado que buscabamos ya se cumple, asi que no se
          // trata como un fallo -- solo se refresca para que la tarjeta deje de mostrarse como
          // "solo catalogo".
          this.addToSectionOpen.set(false);
          this.addToSectionProduct.set(null);
          this.reloadMenuData();
          return;
        }
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
      // Sin este handler, un fallo (404/403/500) no se veia en absoluto: el toggle simplemente
      // no hacia nada y parecia "no funciona" sin ninguna pista de por que.
      error: () => this.toast.danger({ title: this.translate('menu.product.errors.availabilityFailed') }),
    });
  }

  /** `visible` es opcional (mocks/fixtures no lo rellenan); ausente == visible. */
  protected isProductVisible(product: Product): boolean {
    return product.visible !== false;
  }

  /**
   * Publica/oculta el producto de la app sin tocar su disponibilidad ("agotado"). Solo aplica a
   * productos ya colocados en una sección — los solo-catálogo (isCatalogOnly) no tienen todavía
   * un item de sección sobre el que operar (usan "Añadir a sección" primero).
   */
  protected toggleVisibility(product: Product): void {
    if (!product.categoryId || this.isCatalogOnly(product)) return;
    this.menuApi.setItemVisibility(this.menuId(), product.categoryId, product.id, !this.isProductVisible(product)).subscribe({
      complete: () => this.reloadMenuData(),
      error: () => this.toast.danger({ title: this.translate('menu.product.errors.visibilityFailed') }),
    });
  }

  protected openCreateModifierGroup(): void {
    this.modifierGroupToEdit.set(null);
    this.modifierGroupFormOpen.set(true);
  }

  protected openEditModifierGroup(group: ModifierGroup): void {
    this.modifierGroupToEdit.set(group);
    this.modifierGroupFormOpen.set(true);
  }

  protected closeModifierGroupForm(): void {
    this.modifierGroupFormOpen.set(false);
    this.modifierGroupToEdit.set(null);
  }

  protected submitModifierGroupForm(data: CreateModifierGroupRequest): void {
    const editing = this.modifierGroupToEdit();
    this.modifierGroupFormLoading.set(true);
    const request$ = editing ? this.menuApi.updateModifierGroup(editing.id, data) : this.menuApi.createModifierGroup(data);
    request$.subscribe({
      complete: () => {
        this.modifierGroupFormLoading.set(false);
        this.modifierGroupFormOpen.set(false);
        this.modifierGroupToEdit.set(null);
        this.reloadMenuData();
        this.toast.success({
          title: this.translate(editing ? 'menu.modifierGroup.success.updated' : 'menu.modifierGroup.success.created'),
        });
      },
      error: () => {
        this.modifierGroupFormLoading.set(false);
        this.toast.danger({ title: this.translate('menu.modifierGroup.errors.saveFailed') });
      },
    });
  }

  protected openDeleteModifierGroup(group: ModifierGroup): void {
    this.modifierGroupToDelete.set(group);
    this.deleteModifierGroupOpen.set(true);
  }

  protected confirmDeleteModifierGroup(): void {
    const group = this.modifierGroupToDelete();
    if (!group) return;
    this.deleteModifierGroupLoading.set(true);
    this.menuApi.deleteModifierGroup(group.id).subscribe({
      complete: () => {
        this.deleteModifierGroupLoading.set(false);
        this.deleteModifierGroupOpen.set(false);
        this.modifierGroupToDelete.set(null);
        this.reloadMenuData();
        this.toast.success({ title: this.translate('menu.modifierGroup.success.deleted') });
      },
      error: (err: unknown) => {
        this.deleteModifierGroupLoading.set(false);
        const appError = mapHttpError(err);
        const key = appError.type === 'conflict'
          ? 'menu.modifierGroup.errors.inUse'
          : 'menu.modifierGroup.errors.deleteFailed';
        this.toast.danger({ title: this.translate(key) });
      },
    });
  }

  private reloadMenuData(): void {
    this._menuLoading.set(true);
    this.reloadTrigger.next();
  }

  protected setCategoryFilter(value: string): void {
    this.categoryFilter.set(value);
    this.resetSelection();
    if (value === 'all') {
      this.reorderModeActive.set(false);
    }
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

  protected hasAllergenFilter(allergen: Allergen): boolean {
    return this.selectedAllergenFilters().includes(allergen);
  }

  protected toggleAllergenFilter(allergen: Allergen): void {
    this.selectedAllergenFilters.update((current) =>
      current.includes(allergen) ? current.filter((item) => item !== allergen) : [...current, allergen],
    );
    this.resetSelection();
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

    return this.translate('menu.page.productTypes.simple');
  }

  protected productTypeVariant(product: Product): BadgeVariant {
    if (this.isCombo(product)) {
      return 'violet';
    }

    if (this.isPlatter(product)) {
      return 'success';
    }

    return 'neutral';
  }

  protected productImageAlt(product: Product): string {
    return product.name;
  }

  protected compactMetaSummary(product: Product): string {
    return [this.categoryName(product), this.preparationRouteLabel(product)].filter(Boolean).join(' · ');
  }

  protected comboConfigurationSummary(product: Product): string {
    const slotCount = this.comboSlotCount(product);
    const customizationLabel = this.isCustomizable(product)
      ? this.translate('menu.page.customizableBadge')
      : this.translate('menu.page.comboReady');

    return this.translate('menu.page.comboConfigurationSummary', {
      slotCount,
      customizationLabel,
    });
  }

  protected cardInclusionSummary(product: Product): string {
    if (this.isCombo(product)) {
      return this.translate('menu.page.comboInclusionSummary', {
        items: this.comboCompositionSummary(product),
      });
    }

    if (this.isPlatter(product) && product.platterComponents?.length) {
      return this.translate('menu.page.comboInclusionSummary', {
        items: product.platterComponents.map((component) => component.name).join(' + '),
      });
    }

    return product.description || [this.categoryName(product), this.preparationRouteLabel(product)].filter(Boolean).join(' · ');
  }

  protected comboCompositionSummary(product: Product): string {
    const definition = this.comboDefinitions().find((comboDefinition) => comboDefinition.productId === product.id);
    if (!definition) return '';

    return this.pricing.buildComboCompositionSummary(definition, this.products());
  }

  protected customizationSummary(product: Product): string {
    return this.pricing.buildCustomizationSummary(product, this.modifierGroups(), {
      add: this.translate('menu.page.modifierActions.add'),
      remove: this.translate('menu.page.modifierActions.remove'),
      choose: this.translate('menu.page.modifierActions.choose'),
      conjunction: this.translate('menu.page.summaryConjunction'),
      oxfordComma: false,
    });
  }

  protected visibleUpgradeDelta(product: Product): number | null {
    return this.pricing.getMinimumVisibleUpgrade(
      product,
      this.modifierGroups(),
      this.comboDefinitions().find((comboDefinition) => comboDefinition.productId === product.id),
    );
  }

  protected hasVisibleUpgrades(product: Product): boolean {
    return this.visibleUpgradeDelta(product) !== null;
  }

  protected modifierActionLabel(group: ModifierGroup): string {
    const displayType = this.modifierDisplayType(group);

    return this.translate(
      displayType === 'remove'
        ? 'menu.page.modifierActions.remove'
        : displayType === 'add'
          ? 'menu.page.modifierActions.add'
          : 'menu.page.modifierActions.choose',
    );
  }

  protected modifierSectionLabel(group: ModifierGroup): string {
    const displayType = this.modifierDisplayType(group);
    const labelKey =
      displayType === 'remove'
        ? 'menu.page.modifierGroupLabels.remove'
        : displayType === 'add'
          ? 'menu.page.modifierGroupLabels.add'
          : 'menu.page.modifierGroupLabels.choose';

    return this.translate(labelKey, { name: group.name });
  }

  protected modifierLimitLabel(group: ModifierGroup): string {
    if (this.modifierDisplayType(group) === 'single-choice') {
      return this.translate('menu.page.modifierLimits.choose', { count: 1 });
    }

    if (!group.required && group.minSelections === 0) {
      return group.maxSelections > 1
        ? this.translate('menu.page.modifierLimits.upTo', { count: group.maxSelections })
        : this.translate('menu.page.modifierLimits.optional');
    }

    return this.translate('menu.page.modifierLimits.choose', { count: Math.max(group.minSelections, 1) });
  }

  protected modifierOptionLabel(group: ModifierGroup, optionName: string): string {
    if (this.modifierDisplayType(group) === 'remove') {
      return this.translate('menu.customizer.without', { name: optionName });
    }

    return optionName;
  }

  protected modifierUpgradeLabel(group: ModifierGroup, optionName: string): string {
    return this.modifierDisplayType(group) === 'add'
      ? this.translate('menu.page.modifierGroupLabels.add', { name: optionName })
      : optionName;
  }

  protected detailUpgradeItems(product: Product): Array<{ label: string; priceDelta: number }> {
    const modifierItems = this.pricing
      .getModifierGroupsForProduct(product, this.modifierGroups())
      .flatMap((group) =>
        group.options
          .filter((option) => option.priceDelta > 0)
          .map((option) => ({
            label: this.modifierUpgradeLabel(group, option.name),
            priceDelta: option.priceDelta,
          })),
      );
    const comboDefinition = this.comboDefinitions().find((definition) => definition.productId === product.id);
    const comboItems = comboDefinition?.supplements
      .map((supplement) => {
        const slot = comboDefinition.slots.find((candidate) => candidate.id === supplement.slotId);
        const slotProduct = this.products().find((candidate) => candidate.id === supplement.productId);

        return {
          label: slotProduct?.name ?? slot?.name ?? product.name,
          priceDelta: supplement.supplementPrice,
        };
      })
      .filter((item) => item.priceDelta > 0) ?? [];

    return [...modifierItems, ...comboItems];
  }

  protected availabilityLabel(product: Product): string {
    return product.available ? this.translate('menu.page.availabilityAvailable') : this.translate('menu.page.soldOut');
  }

  protected preparationRouteLabel(product: Product): string {
    return this.translate(`menu.page.preparationRoutes.${this.preparationRouteKey(product.preparationPolicy.route)}`);
  }

  protected productAllergenLabels(product: Product): string[] {
    return (product.allergens ?? []).map((allergen) => this.toAllergenLabel(allergen));
  }

  protected productAllergenSummary(product: Product, maxVisible = 2): string {
    const labels = this.productAllergenLabels(product);
    if (!labels.length) {
      return this.translate('menu.page.noAllergens');
    }

    if (labels.length <= maxVisible) {
      return labels.join(', ');
    }

    return `${labels.slice(0, maxVisible).join(', ')} +${labels.length - maxVisible}`;
  }

  protected categoryProductCount(categoryId: string): number {
    return this.products().filter((product) => product.categoryId === categoryId).length;
  }

  protected modifierGroupUsageCount(groupId: string): number {
    return this.products().filter((product) => product.modifierGroupIds.includes(groupId)).length;
  }

  protected childCategories(categoryId: string): string {
    return this.categories()
      .filter((category) => category.parentId === categoryId)
      .map((category) => category.name)
      .join(', ');
  }

  protected parentCategoryName(category: MenuCategory): string {
    return this.categories().find((candidate) => candidate.id === category.parentId)?.name ?? category.parentId ?? '';
  }

  protected categoryAccentClass(category: MenuCategory): string {
    return category.parentId
      ? 'border-l-4 border-l-violet-400 dark:border-l-violet-500'
      : 'border-l-4 border-l-cyan-400 dark:border-l-cyan-500';
  }

  protected categoryIconClass(category: MenuCategory): string {
    return category.parentId ? 'text-violet-500 dark:text-violet-400' : 'text-cyan-500 dark:text-cyan-400';
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
        ...this.productAllergenLabels(product),
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

  private translate(key: string, params?: Record<string, string | number>): string {
    return this.transloco.translate(key, params);
  }

  protected modifierDisplayType(group: ModifierGroup): ModifierGroupDisplayType {
    return group.displayType ?? deriveModifierGroupDisplayType(group);
  }

  protected productHasAuditWarning(product: Product, type: MenuAuditWarningType): boolean {
    return this.audit.hasWarning(product.id, type, this.auditReport());
  }

  protected exportAuditCsv(): void {
    const issues = this.auditReport().issues;
    if (!issues.length) {
      return;
    }

    const header = [
      this.translate('menu.page.audit.csvColumns.product'),
      this.translate('menu.page.audit.csvColumns.issue'),
      this.translate('menu.page.audit.csvColumns.priority'),
    ];
    const rows = issues.map((issue) => [
      issue.productName,
      this.translate(`menu.page.audit.warningLabels.${issue.type}`),
      this.translate(`menu.page.audit.priorityLabels.${issue.priority}`),
    ]);

    const csvContent = [header, ...rows].map((row) => row.map((cell) => this.escapeCsvCell(cell)).join(',')).join('\r\n');
    const blob = new Blob([`﻿${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria-menu-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private escapeCsvCell(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return /[",\r\n]/.test(value) ? `"${escaped}"` : escaped;
  }

  private matchesReviewFilter(product: Product, filter: ReviewFilter): boolean {
    if (filter === 'combo-only') return this.isCombo(product);
    if (filter === 'customizable-only') return this.isCustomizable(product);
    if (filter === 'with-image') return !!product.imageUrl;
    if (filter === 'without-image') return !product.imageUrl;
    if (filter === 'no-section') return this.isCatalogOnly(product);
    return !product.description?.trim();
  }

  private matchesAllergenFilters(product: Product, selectedFilters: readonly Allergen[]): boolean {
    const normalizedProductAllergens = new Set(
      (product.allergens ?? []).flatMap((allergen) => {
        const label = this.toAllergenLabel(allergen);
        return [this.normalize(allergen), this.normalize(label)];
      }),
    );

    return selectedFilters.some((filter) => {
      const label = this.translate(`menu.allergen.${filter}`);
      return normalizedProductAllergens.has(this.normalize(filter)) || normalizedProductAllergens.has(this.normalize(label));
    });
  }

  private toAllergenLabel(allergen: string): string {
    const normalizedValue = this.normalize(allergen);
    const matched = ALLERGEN_VALUES.find((candidate) => {
      const label = this.translate(`menu.allergen.${candidate}`);
      return this.normalize(candidate) === normalizedValue || this.normalize(label) === normalizedValue;
    });

    return matched ? this.translate(`menu.allergen.${matched}`) : allergen;
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
    imageUrl: cp.imageUrl,
    categoryId: '',
    basePrice: cp.priceCents / 100,
    price: cp.priceCents / 100,
    available: cp.isAvailable,
    visible: cp.isVisible,
    allergens: cp.allergens ?? [],
    course: cp.course,
    type: cp.productType as Product['type'],
    modifierGroupIds: cp.modifierGroupIds,
    preparationPolicy: {
      route: cp.preparationRoute,
      requiresReadyBeforeServe: cp.preparationRoute !== 'bar' && cp.preparationRoute !== 'direct',
    },
  };
}
