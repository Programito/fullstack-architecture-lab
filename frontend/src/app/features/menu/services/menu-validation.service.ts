import { Injectable, inject } from '@angular/core';
import type { Product } from '../models/menu.models';
import { MenuPricingService } from './menu-pricing.service';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class MenuValidationService {
  private readonly pricing = inject(MenuPricingService);

  validateCustomization(product: Product, selectedModifierOptionIds: string[]): ValidationResult {
    const errors: string[] = [];

    if (!product.available) {
      errors.push('Product is unavailable.');
    }

    const groups = this.pricing.getModifierGroupsForProduct(product);
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
}

