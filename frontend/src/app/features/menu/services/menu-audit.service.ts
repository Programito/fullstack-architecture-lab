import { Injectable, inject } from '@angular/core';
import type { ComboProductDefinition, ModifierGroup, Product } from '../models/menu.models';
import {
  MENU_AUDIT_WARNING_TYPES,
  type MenuAuditCounter,
  type MenuAuditIssue,
  type MenuAuditPriority,
  type MenuAuditReport,
  type MenuAuditWarningType,
} from '../models/menu-audit.model';
import { MenuPricingService } from './menu-pricing.service';

const AUDIT_PRIORITY: Record<MenuAuditWarningType, MenuAuditPriority> = {
  'missing-image': 'high',
  'missing-description': 'high',
  'missing-section': 'high',
  unavailable: 'medium',
  'weak-combo-summary': 'medium',
  'weak-customization-summary': 'medium',
};

@Injectable({ providedIn: 'root' })
export class MenuAuditService {
  private readonly pricing = inject(MenuPricingService);

  buildReport(products: readonly Product[], modifierGroups: readonly ModifierGroup[], comboDefinitions: readonly ComboProductDefinition[]): MenuAuditReport {
    const warningsByProductId: Record<string, MenuAuditWarningType[]> = {};
    const issues = products.flatMap((product) => {
      const warnings = this.getWarningsForProduct(product, products, modifierGroups, comboDefinitions);
      warningsByProductId[product.id] = warnings;

      return warnings.map<MenuAuditIssue>((type) => ({
        type,
        productId: product.id,
        productName: product.name,
        priority: AUDIT_PRIORITY[type],
      }));
    });

    return {
      issues,
      counters: this.buildCounters(issues),
      warningsByProductId,
    };
  }

  hasWarning(productId: string, type: MenuAuditWarningType, report: MenuAuditReport): boolean {
    return report.warningsByProductId[productId]?.includes(type) ?? false;
  }

  private buildCounters(issues: readonly MenuAuditIssue[]): MenuAuditCounter[] {
    return MENU_AUDIT_WARNING_TYPES
      .map((type) => {
        const matchingIssues = issues.filter((issue) => issue.type === type);
        return {
          type,
          count: matchingIssues.length,
          priority: AUDIT_PRIORITY[type],
          exampleProductName: matchingIssues[0]?.productName ?? null,
        } satisfies MenuAuditCounter;
      })
      .filter((counter) => counter.count > 0)
      .sort((first, second) => {
        const priorityOrder = this.priorityRank(first.priority) - this.priorityRank(second.priority);
        return priorityOrder !== 0 ? priorityOrder : second.count - first.count;
      });
  }

  private getWarningsForProduct(
    product: Product,
    products: readonly Product[],
    modifierGroups: readonly ModifierGroup[],
    comboDefinitions: readonly ComboProductDefinition[],
  ): MenuAuditWarningType[] {
    const warnings: MenuAuditWarningType[] = [];

    if (!product.imageUrl) {
      warnings.push('missing-image');
    }

    if (!product.description?.trim()) {
      warnings.push('missing-description');
    }

    if (!product.categoryId.trim()) {
      warnings.push('missing-section');
    }

    if (!product.available) {
      warnings.push('unavailable');
    }

    if (product.type === 'combo' && this.hasWeakComboSummary(product, products, comboDefinitions)) {
      warnings.push('weak-combo-summary');
    }

    if (product.modifierGroupIds.length > 0 && this.hasWeakCustomizationSummary(product, modifierGroups)) {
      warnings.push('weak-customization-summary');
    }

    return warnings;
  }

  private hasWeakComboSummary(product: Product, products: readonly Product[], comboDefinitions: readonly ComboProductDefinition[]): boolean {
    const definition = comboDefinitions.find((comboDefinition) => comboDefinition.productId === product.id);
    if (!definition) {
      return true;
    }

    const summary = this.pricing.buildComboCompositionSummary(definition, [...products]).trim();
    return !summary || definition.slots.length < 2;
  }

  private hasWeakCustomizationSummary(product: Product, modifierGroups: readonly ModifierGroup[]): boolean {
    const summary = this.pricing.buildCustomizationSummary(product, [...modifierGroups], {
      add: 'Add',
      remove: 'Remove',
      choose: 'Choose',
      conjunction: 'or',
      oxfordComma: false,
    });

    return !summary.trim();
  }

  private priorityRank(priority: MenuAuditPriority): number {
    return priority === 'high' ? 0 : priority === 'medium' ? 1 : 2;
  }
}
