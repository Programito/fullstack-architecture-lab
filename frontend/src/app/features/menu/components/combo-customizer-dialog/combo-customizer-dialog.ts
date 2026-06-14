import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import type { ComboProductDefinition, ComboSlot, ComboSlotSelection, Product } from '../../models/menu.models';
import { MenuPricingService } from '../../services/menu-pricing.service';
import { MenuValidationService } from '../../services/menu-validation.service';

export interface ComboCustomizationConfirmed {
  comboProductId: string;
  slotSelections: ComboSlotSelection[];
}

@Component({
  selector: 'app-combo-customizer-dialog',
  imports: [Button, Dialog, TranslocoPipe],
  templateUrl: './combo-customizer-dialog.html',
})
export class ComboCustomizerDialog {
  readonly open = input(false);
  readonly comboProduct = input<Product | null>(null);
  readonly comboDefinition = input<ComboProductDefinition | null>(null);
  readonly products = input<readonly Product[]>([]);

  readonly closed = output<void>();
  readonly cancelled = output<void>();
  readonly confirmed = output<ComboCustomizationConfirmed>();

  private readonly pricing = inject(MenuPricingService);
  private readonly validation = inject(MenuValidationService);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  protected readonly selectedProductsBySlot = signal<Record<string, string[]>>({});
  protected readonly slotSelections = computed<ComboSlotSelection[]>(() =>
    Object.entries(this.selectedProductsBySlot()).map(([slotId, selectedProductIds]) => ({ slotId, selectedProductIds })),
  );
  protected readonly validationResult = computed(() => {
    const definition = this.comboDefinition();
    return definition ? this.validation.validateCombo(definition, this.slotSelections(), this.products()) : { valid: false, errors: [] };
  });
  protected readonly totalPrice = computed(() => {
    const product = this.comboProduct();
    const definition = this.comboDefinition();
    return product && definition ? this.pricing.calculateComboTotalPrice(product, definition, this.slotSelections()) : 0;
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }

      this.selectedProductsBySlot.set(this.defaultSelections());
    });
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.activeLang(), { style: 'currency', currency: 'EUR' }).format(value);
  }

  protected slotProducts(slot: ComboSlot): Product[] {
    const productsById = new Map(this.products().map((product) => [product.id, product]));
    return slot.allowedProductIds.map((productId) => productsById.get(productId)).filter((product): product is Product => !!product);
  }

  protected supplementPrice(slotId: string, productId: string): number {
    return this.comboDefinition()?.supplements.find((supplement) => supplement.slotId === slotId && supplement.productId === productId)?.supplementPrice ?? 0;
  }

  protected isSelected(slotId: string, productId: string): boolean {
    return this.selectedProductsBySlot()[slotId]?.includes(productId) ?? false;
  }

  protected selectProduct(slot: ComboSlot, product: Product): void {
    if (!product.available) {
      return;
    }

    this.selectedProductsBySlot.update((selectedProductsBySlot) => {
      const currentSelection = selectedProductsBySlot[slot.id] ?? [];
      const nextSelection =
        slot.maxSelections === 1
          ? [product.id]
          : currentSelection.includes(product.id)
            ? currentSelection.filter((productId) => productId !== product.id)
            : [...currentSelection, product.id].slice(0, slot.maxSelections);

      return {
        ...selectedProductsBySlot,
        [slot.id]: nextSelection,
      };
    });
  }

  protected noValidProducts(slot: ComboSlot): boolean {
    return this.slotProducts(slot).every((product) => !product.available);
  }

  protected close(): void {
    this.cancelled.emit();
    this.closed.emit();
  }

  protected confirm(): void {
    const product = this.comboProduct();

    if (!product || !this.validationResult().valid) {
      return;
    }

    this.confirmed.emit({
      comboProductId: product.id,
      slotSelections: this.slotSelections(),
    });
  }

  private defaultSelections(): Record<string, string[]> {
    const definition = this.comboDefinition();

    if (!definition) {
      return {};
    }

    const productsById = new Map(this.products().map((product) => [product.id, product]));

    return Object.fromEntries(
      definition.slots.map((slot) => {
        const defaultProduct = slot.defaultProductId ? productsById.get(slot.defaultProductId) : null;
        const fallbackProduct = slot.allowedProductIds.map((productId) => productsById.get(productId)).find((product) => product?.available);
        const selectedProduct = defaultProduct?.available ? defaultProduct : fallbackProduct;

        return [slot.id, selectedProduct ? [selectedProduct.id] : []];
      }),
    );
  }
}
