import { Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { SearchInput } from '../../../../shared/ui/search-input/search-input';
import { Select, type SelectOption } from '../../../../shared/ui/select/select';
import { SegmentedControl, type SegmentedControlOption } from '../../../../shared/ui/segmented-control/segmented-control';
import type { Product } from '../../models/restaurant-pos.models';
import { toProductPickerItem } from './product-picker-item.mapper';

export type ProductSearchView = 'all' | 'favorites';

@Component({
  selector: 'app-product-search-dialog',
  imports: [Dialog, Icon, SearchInput, Select, SegmentedControl],
  templateUrl: './product-search-dialog.html',
})
export class ProductSearchDialog {
  readonly open = input(false);
  readonly query = input('');
  readonly products = input<readonly Product[]>([]);
  readonly productView = input<ProductSearchView>('all');
  readonly productCategoryFilter = input('all');
  readonly productCategoryOptions = input<SelectOption[]>([]);
  readonly favoriteProductIds = input<readonly string[]>([]);
  readonly lastAddedProductId = input<string | null>(null);
  readonly productQuantities = input<Record<string, number>>({});

  readonly closed = output<void>();
  readonly finished = output<void>();
  readonly queryChanged = output<string>();
  readonly searched = output<string>();
  readonly productViewChanged = output<ProductSearchView>();
  readonly productCategoryFilterChanged = output<string>();
  readonly favoriteToggled = output<string>();
  readonly productIncremented = output<string>();
  readonly productDecremented = output<string>();

  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  private readonly fallbackTranslations: Record<string, string> = {
    'restaurantPos.service.addProductsTitle': 'Añadir productos',
    'restaurantPos.service.addProductsDescription': 'Busca, filtra y añade productos al pedido.',
    'restaurantPos.service.searchProduct': 'Buscar producto',
    'restaurantPos.service.searchProductPlaceholder': 'Buscar plato, bebida o alérgeno',
    'restaurantPos.service.productView': 'Vista de productos',
    'restaurantPos.service.allProducts': 'Todos',
    'restaurantPos.service.favoriteProducts': 'Favoritos',
    'restaurantPos.service.productCategoryFilter': 'Categoría',
    'restaurantPos.service.productAdded': 'Añadido',
    'restaurantPos.service.customizable': 'Personalizable',
    'restaurantPos.service.combo': 'Menú',
    'restaurantPos.service.platter': 'Plato combinado',
    'restaurantPos.service.soldOut': 'Agotado',
    'restaurantPos.service.finishProductSearch': 'Cerrar',
    'restaurantPos.service.productPickerSummary': '{{count}} productos añadidos · {{total}}',
    'restaurantPos.service.addProductAction': 'Añadir',
    'restaurantPos.service.configureProductAction': 'Configurar',
    'restaurantPos.service.configureComboAction': 'Configurar menú',
    'restaurantPos.service.configureProductActionLabel': 'Configurar {{name}}',
    'restaurantPos.service.configureComboActionLabel': 'Configurar menú {{name}}',
    'restaurantPos.service.addComboToOrder': 'Añadir menú',
    'restaurantPos.service.comboBasePrice': 'Precio base',
    'restaurantPos.service.comboTotal': 'Total menú',
    'restaurantPos.service.productQuantityLabel': 'Cantidad de {{name}}: {{count}}',
    'restaurantPos.service.addFavoriteProduct': 'Añadir {{name}} a favoritos',
    'restaurantPos.service.removeFavoriteProduct': 'Quitar {{name}} de favoritos',
    'restaurantPos.service.closeProductSearch': 'Cerrar buscador de productos',
    'restaurantPos.service.clearProductSearch': 'Limpiar búsqueda de productos',
    'restaurantPos.service.noProductResults': 'No hay productos que coincidan con la búsqueda.',
    'restaurantPos.service.noAllergens': 'Sin alérgenos indicados',
    'restaurantPos.service.increaseProductQuantityActionLabel': 'Añadir una unidad de {{name}}',
    'restaurantPos.service.decreaseProductQuantityActionLabel': 'Quitar una unidad de {{name}}',
  };
  protected readonly productViewOptions = computed<SegmentedControlOption[]>(() => [
    { label: this.translate('restaurantPos.service.allProducts'), value: 'all' },
    { label: this.translate('restaurantPos.service.favoriteProducts'), value: 'favorites' },
  ]);
  protected readonly productPickerSummary = computed(() => {
    const productById = new Map(this.products().map((product) => [product.id, product]));
    let count = 0;
    let total = 0;

    for (const [productId, quantity] of Object.entries(this.productQuantities())) {
      if (quantity <= 0) {
        continue;
      }

      count += quantity;
      const product = productById.get(productId);
      total += (product ? this.productPrice(product) : 0) * quantity;
    }

    if (count === 0) {
      return '';
    }

    return this.translate('restaurantPos.service.productPickerSummary', {
      count,
      total: this.formatCurrency(total),
    });
  });
  protected readonly productPickerItems = computed(() =>
    this.products().map((product) =>
      toProductPickerItem(product, {
        favoriteProductIds: this.favoriteProductIds(),
        lastAddedProductId: this.lastAddedProductId(),
        productQuantities: this.productQuantities(),
        formatCurrency: (value) => this.formatCurrency(value),
        translate: (key, params) => this.translate(key, params),
      }),
    ),
  );

  protected text(key: string, params?: Record<string, unknown>): string {
    return this.translate(key, params);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.activeLang(), { style: 'currency', currency: 'EUR' }).format(value);
  }

  protected productPrice(product: Product): number {
    return product.basePrice ?? product.price ?? 0;
  }

  protected changeProductView(value: string): void {
    if (value === 'all' || value === 'favorites') {
      this.productViewChanged.emit(value);
    }
  }

  private translate(key: string, params?: Record<string, unknown>): string {
    this.activeLang();
    const translated = this.transloco.translate(key, params);

    if (translated && translated !== key) {
      return translated;
    }

    return this.interpolate(this.fallbackTranslations[key] ?? key, params);
  }

  private interpolate(value: string, params?: Record<string, unknown>): string {
    if (!params) {
      return value;
    }

    return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, param: string) => String(params[param] ?? ''));
  }
}
