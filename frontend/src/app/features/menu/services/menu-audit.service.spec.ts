import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import type { Product } from '../models/menu.models';
import {
  localizeComboProductDefinitions,
  localizeMenuProducts,
  localizeModifierGroups,
} from './menu-mock.service';
import { MenuAuditService } from './menu-audit.service';

describe('MenuAuditService', () => {
  const setup = () => TestBed.runInInjectionContext(() => new MenuAuditService());

  it('classifies representative merchandising and operations warnings', () => {
    const service = setup();
    const modifierGroups = localizeModifierGroups('es');
    const comboDefinitions = localizeComboProductDefinitions('es').filter((definition) => definition.productId !== 'product-16');
    const products = localizeMenuProducts('es');

    const catalogOnlyProduct: Product = {
      id: 'rp-catalog-review',
      restaurantProductId: 'rp-catalog-review',
      name: 'Agua mineral',
      categoryId: '',
      imageUrl: null,
      basePrice: 1.5,
      price: 1.5,
      available: true,
      course: 'drinks',
      type: 'simple',
      modifierGroupIds: [],
      preparationPolicy: { route: 'direct', requiresReadyBeforeServe: false },
    };

    const customWithoutReadableSummary: Product = {
      ...products.find((product) => product.id === 'product-1')!,
      id: 'product-custom-weak',
      name: 'Hamburguesa craft review',
      modifierGroupIds: ['missing-group'],
    };

    const report = service.buildReport(
      [...products, catalogOnlyProduct, customWithoutReadableSummary],
      modifierGroups,
      comboDefinitions,
    );

    expect(report.warningsByProductId['rp-catalog-review']).toEqual(
      expect.arrayContaining(['missing-image', 'missing-description', 'missing-section']),
    );
    expect(report.warningsByProductId['product-4']).toContain('unavailable');
    expect(report.warningsByProductId['product-16']).toContain('weak-combo-summary');
    expect(report.warningsByProductId['product-custom-weak']).toContain('weak-customization-summary');
    expect(report.counters.find((counter) => counter.type === 'missing-image')?.count).toBeGreaterThan(0);
  });
});
