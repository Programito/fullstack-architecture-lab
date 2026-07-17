import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import type { ModifierGroup, Product } from '../../models/menu.models';
import { MenuPricingService } from '../../services/menu-pricing.service';
import { MenuValidationService } from '../../services/menu-validation.service';

export interface ProductCustomizationConfirmed {
  productId: string;
  selectedModifierOptionIds: string[];
  kitchenNote?: string;
}

@Component({
  selector: 'app-product-customizer-dialog',
  imports: [Button, Dialog, TranslocoPipe],
  templateUrl: './product-customizer-dialog.html',
})
export class ProductCustomizerDialog {
  readonly open = input(false);
  readonly product = input<Product | null>(null);
  readonly modifierGroups = input<readonly ModifierGroup[]>([]);
  readonly closed = output<void>();
  readonly confirmed = output<ProductCustomizationConfirmed>();

  private readonly pricing = inject(MenuPricingService);
  private readonly validation = inject(MenuValidationService);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  protected readonly selectedOptionIds = signal<string[]>([]);
  protected readonly kitchenNote = signal('');
  protected readonly selectedModifiers = computed(() => {
    const product = this.product();
    return product ? this.pricing.buildSelectedModifiers(product, this.selectedOptionIds(), [...this.modifierGroups()]) : [];
  });
  protected readonly previewPrice = computed(() => {
    const product = this.product();
    return product ? this.pricing.calculateCustomizedProductPrice(product, this.selectedModifiers()) : 0;
  });
  protected readonly validationResult = computed(() => {
    const product = this.product();
    return product ? this.validation.validateCustomization(product, this.selectedOptionIds(), [...this.modifierGroups()]) : { valid: false, errors: [] };
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }

      this.selectedOptionIds.set(this.defaultOptionIds());
      this.kitchenNote.set('');
    });
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat(this.activeLang(), { style: 'currency', currency: 'EUR' }).format(value);
  }

  protected isSelected(optionId: string): boolean {
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

  protected updateKitchenNote(event: Event): void {
    this.kitchenNote.set((event.target as HTMLTextAreaElement).value);
  }

  protected confirm(): void {
    const product = this.product();

    if (!product || !this.validationResult().valid) {
      return;
    }

    const normalizedNote = this.kitchenNote().trim();
    this.confirmed.emit({
      productId: product.id,
      selectedModifierOptionIds: this.selectedOptionIds(),
      ...(normalizedNote ? { kitchenNote: normalizedNote } : {}),
    });
  }

  private defaultOptionIds(): string[] {
    return this.modifierGroups().flatMap((group) => group.options.filter((option) => option.selectedByDefault).map((option) => option.id));
  }
}

