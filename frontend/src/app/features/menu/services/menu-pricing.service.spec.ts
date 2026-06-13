import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '../../../shared/i18n/i18n-testing';
import { MOCK_MENU_PRODUCTS } from './menu-mock.service';
import { MenuPricingService } from './menu-pricing.service';
import { MenuValidationService } from './menu-validation.service';

describe('menu business logic', () => {
  let pricing: MenuPricingService;
  let validation: MenuValidationService;
  const burger = () => MOCK_MENU_PRODUCTS.find((product) => product.id === 'product-1')!;
  const water = () => MOCK_MENU_PRODUCTS.find((product) => product.id === 'product-10')!;
  const unavailable = () => MOCK_MENU_PRODUCTS.find((product) => product.id === 'product-4')!;

  beforeEach(() => {
    const i18n = provideI18nTesting('en');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [...i18n.imports],
      providers: [...i18n.providers],
    });
    pricing = TestBed.inject(MenuPricingService);
    validation = TestBed.inject(MenuValidationService);
  });

  it('calculates base product price without modifiers', () => {
    expect(pricing.calculateCustomizedProductPrice(water(), [])).toBe(2);
  });

  it('calculates price with one or multiple extra modifiers', () => {
    const oneExtra = pricing.buildSelectedModifiers(burger(), ['point-medium', 'extra-bacon']);
    const multipleExtras = pricing.buildSelectedModifiers(burger(), ['point-medium', 'extra-bacon', 'extra-cheese']);

    expect(pricing.calculateCustomizedProductPrice(burger(), oneExtra)).toBe(14);
    expect(pricing.calculateCustomizedProductPrice(burger(), multipleExtras)).toBe(15);
  });

  it('keeps remove modifiers free', () => {
    const modifiers = pricing.buildSelectedModifiers(burger(), ['point-medium', 'remove-onion', 'remove-sauce']);

    expect(pricing.calculateCustomizedProductPrice(burger(), modifiers)).toBe(12.5);
  });

  it('validates required single, max selections, invalid options and unavailable products', () => {
    expect(validation.validateCustomization(burger(), ['extra-bacon']).valid).toBe(false);
    expect(validation.validateCustomization(burger(), ['point-medium', 'extra-bacon', 'extra-cheese', 'extra-egg', 'remove-onion']).valid).toBe(true);
    expect(validation.validateCustomization(burger(), ['point-medium', 'unknown-option']).valid).toBe(false);
    expect(validation.validateCustomization(unavailable(), []).valid).toBe(false);
  });

  it('requires selected options to belong to the product modifier groups', () => {
    expect(validation.validateCustomization(water(), ['extra-bacon']).valid).toBe(false);
  });

  it('creates stable configuration signatures that include modifiers and kitchen notes', () => {
    expect(pricing.createConfigurationSignature('product-1', ['extra-bacon', 'point-medium'], 'Little done')).toBe(
      pricing.createConfigurationSignature('product-1', ['point-medium', 'extra-bacon'], 'Little done'),
    );
    expect(pricing.createConfigurationSignature('product-1', ['point-medium'], 'Little done')).not.toBe(
      pricing.createConfigurationSignature('product-1', ['point-medium', 'extra-bacon'], 'Little done'),
    );
    expect(pricing.createConfigurationSignature('product-1', ['point-medium'], 'Little done')).not.toBe(
      pricing.createConfigurationSignature('product-1', ['point-medium'], 'No salt'),
    );
  });

  it('builds selected modifiers with names, deltas, groups and types', () => {
    expect(pricing.buildSelectedModifiers(burger(), ['point-medium', 'extra-cheese', 'remove-onion'])).toEqual([
      expect.objectContaining({ groupName: 'Burger extras', name: 'Cheese', priceDelta: 1, type: 'multiple' }),
      expect.objectContaining({ groupName: 'Remove ingredients', name: 'Onion', priceDelta: 0, type: 'remove' }),
      expect.objectContaining({ groupName: 'Burger point', name: 'Medium', priceDelta: 0, type: 'single' }),
    ]);
  });
});
