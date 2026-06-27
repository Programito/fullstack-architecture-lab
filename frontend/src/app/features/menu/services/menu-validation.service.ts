import { Injectable, inject } from '@angular/core';
import type { ComboProductDefinition, ComboSlotSelection, ModifierGroup, Product } from '../models/menu.models';
import { MenuPricingService } from './menu-pricing.service';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class MenuValidationService {
  private readonly pricing = inject(MenuPricingService);

  validateCustomization(product: Product, selectedModifierOptionIds: string[], modifierGroups: ModifierGroup[]): ValidationResult {
    const errors: string[] = [];

    if (!product.available) {
      errors.push('Product is unavailable.');
    }

    const groups = this.pricing.getModifierGroupsForProduct(product, modifierGroups);
    const assignedOptionIds = new Set(groups.flatMap((group) => group.options.map((option) => option.id)));
    const selectedIds = [...new Set(selectedModifierOptionIds)];

    for (const optionId of selectedIds) {
      if (!assignedOptionIds.has(optionId)) {
        errors.push(`Selected option ${optionId} does not belong to ${product.name}.`);
      }
    }

    for (const group of groups) {
      const selectedCount = group.options.filter((option) => selectedIds.includes(option.id)).length;

      if (group.required && group.type === 'single' && selectedCount !== 1) {
        errors.push(`${group.name} requires exactly one option.`);
      }

      if (group.type === 'single' && selectedCount > 1) {
        errors.push(`${group.name} allows only one option.`);
      }

      if (group.type !== 'single' && selectedCount > group.maxSelections) {
        errors.push(`${group.name} allows at most ${group.maxSelections} options.`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  validateCombo(comboDefinition: ComboProductDefinition, slotSelections: ComboSlotSelection[], products: readonly Product[]): ValidationResult {
    const errors: string[] = [];
    const productsById = new Map(products.map((product) => [product.id, product]));
    const selectionsBySlot = new Map(slotSelections.map((selection) => [selection.slotId, [...new Set(selection.selectedProductIds)]]));

    for (const selection of slotSelections) {
      if (!comboDefinition.slots.some((slot) => slot.id === selection.slotId)) {
        errors.push(`Selected slot ${selection.slotId} does not belong to combo.`);
      }
    }

    for (const slot of comboDefinition.slots) {
      const selectedProductIds = selectionsBySlot.get(slot.id) ?? [];

      if (slot.required && selectedProductIds.length < slot.minSelections) {
        errors.push(`${slot.name} requires at least ${slot.minSelections} selection.`);
      }

      if (selectedProductIds.length > slot.maxSelections) {
        errors.push(`${slot.name} allows at most ${slot.maxSelections} selections.`);
      }

      for (const productId of selectedProductIds) {
        const product = productsById.get(productId);

        if (!slot.allowedProductIds.includes(productId)) {
          errors.push(`${productId} is not allowed in ${slot.name}.`);
        }

        if (!product?.available) {
          errors.push(`${product?.name ?? productId} is unavailable.`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
