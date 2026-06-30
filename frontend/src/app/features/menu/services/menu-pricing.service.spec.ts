import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '../../../shared/i18n/i18n-testing';
import { MOCK_COMBO_PRODUCT_DEFINITIONS, MOCK_MENU_PRODUCTS, MOCK_MODIFIER_GROUPS } from './menu-mock.service';
import { MenuPricingService } from './menu-pricing.service';
import { MenuValidationService } from './menu-validation.service';

describe('menu business logic', () => {
  let pricing: MenuPricingService;
  let validation: MenuValidationService;
  const burger = () => MOCK_MENU_PRODUCTS.find((product) => product.id === 'product-1')!;
  const combo = () => MOCK_MENU_PRODUCTS.find((product) => product.id === 'product-16')!;
  const comboDefinition = () => MOCK_COMBO_PRODUCT_DEFINITIONS.find((definition) => definition.productId === combo().id)!;
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
    const oneExtra = pricing.buildSelectedModifiers(burger(), ['point-medium', 'extra-bacon'], MOCK_MODIFIER_GROUPS);
    const multipleExtras = pricing.buildSelectedModifiers(burger(), ['point-medium', 'extra-bacon', 'extra-cheese'], MOCK_MODIFIER_GROUPS);

    expect(pricing.calculateCustomizedProductPrice(burger(), oneExtra)).toBe(14);
    expect(pricing.calculateCustomizedProductPrice(burger(), multipleExtras)).toBe(15);
  });

  it('keeps remove modifiers free', () => {
    const modifiers = pricing.buildSelectedModifiers(burger(), ['point-medium', 'remove-onion', 'remove-sauce'], MOCK_MODIFIER_GROUPS);

    expect(pricing.calculateCustomizedProductPrice(burger(), modifiers)).toBe(12.5);
  });

  it('validates required single, max selections, invalid options and unavailable products', () => {
    expect(validation.validateCustomization(burger(), ['extra-bacon'], MOCK_MODIFIER_GROUPS).valid).toBe(false);
    expect(validation.validateCustomization(burger(), ['point-medium', 'extra-bacon', 'extra-cheese', 'extra-egg', 'remove-onion'], MOCK_MODIFIER_GROUPS).valid).toBe(true);
    expect(validation.validateCustomization(burger(), ['point-medium', 'unknown-option'], MOCK_MODIFIER_GROUPS).valid).toBe(false);
    expect(validation.validateCustomization(unavailable(), [], MOCK_MODIFIER_GROUPS).valid).toBe(false);
  });

  it('requires selected options to belong to the product modifier groups', () => {
    expect(validation.validateCustomization(water(), ['extra-bacon'], MOCK_MODIFIER_GROUPS).valid).toBe(false);
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
    expect(pricing.buildSelectedModifiers(burger(), ['point-medium', 'extra-cheese', 'remove-onion'], MOCK_MODIFIER_GROUPS)).toEqual([
      expect.objectContaining({ groupName: 'Burger extras', name: 'Cheese', priceDelta: 1, type: 'multiple' }),
      expect.objectContaining({ groupName: 'Remove ingredients', name: 'Onion', priceDelta: 0, type: 'remove' }),
      expect.objectContaining({ groupName: 'Burger point', name: 'Medium', priceDelta: 0, type: 'single' }),
    ]);
  });

  it('builds display-safe combo, customization and upgrade summaries', () => {
    expect(pricing.buildComboCompositionSummary(comboDefinition(), MOCK_MENU_PRODUCTS)).toBe('Classic Burger + Fries + Coca-Cola');
    expect(pricing.buildCustomizationSummary(burger(), MOCK_MODIFIER_GROUPS)).toBe(
      'Add Bacon, Cheese, or Egg · Remove Onion, Pickles, or Sauce · Choose Burger point',
    );
    expect(pricing.getMinimumVisibleUpgrade(burger(), MOCK_MODIFIER_GROUPS)).toBe(1);
    expect(pricing.getMinimumVisibleUpgrade(combo(), MOCK_MODIFIER_GROUPS, comboDefinition())).toBe(1);
  });

  it('calculates combo base, supplements and total from slot selections', () => {
    const selections = [
      { slotId: 'combo-burger', selectedProductIds: ['product-7'] },
      { slotId: 'combo-side', selectedProductIds: ['product-9'] },
      { slotId: 'combo-drink', selectedProductIds: ['product-10'] },
    ];

    expect(pricing.calculateComboBasePrice(combo())).toBe(13.5);
    expect(pricing.calculateComboSlotSupplements(comboDefinition(), selections)).toBe(3);
    expect(pricing.calculateComboTotalPrice(combo(), comboDefinition(), selections)).toBe(16.5);
  });

  it('applies combo supplements by slot and product together', () => {
    const definition = {
      ...comboDefinition(),
      supplements: [
        ...comboDefinition().supplements,
        { slotId: 'combo-side', productId: 'product-7', supplementPrice: 9 },
      ],
    };

    expect(pricing.calculateComboSlotSupplements(definition, [{ slotId: 'combo-burger', selectedProductIds: ['product-7'] }])).toBe(2);
  });

  it('creates stable combo signatures independent of slot order', () => {
    const first = [
      { slotId: 'combo-drink', selectedProductIds: ['product-10'] },
      { slotId: 'combo-burger', selectedProductIds: ['product-7'] },
      { slotId: 'combo-side', selectedProductIds: ['product-9'] },
    ];
    const second = [
      { slotId: 'combo-burger', selectedProductIds: ['product-7'] },
      { slotId: 'combo-side', selectedProductIds: ['product-9'] },
      { slotId: 'combo-drink', selectedProductIds: ['product-10'] },
    ];

    expect(pricing.createComboConfigurationSignature(combo().id, first)).toBe(pricing.createComboConfigurationSignature(combo().id, second));
    expect(pricing.createComboConfigurationSignature(combo().id, second)).not.toBe(
      pricing.createComboConfigurationSignature(combo().id, [{ slotId: 'combo-burger', selectedProductIds: ['product-12'] }]),
    );
  });

  it('validates combo required slots, allowed products, availability and max selections', () => {
    expect(validation.validateCombo(comboDefinition(), [{ slotId: 'combo-burger', selectedProductIds: ['product-12'] }], MOCK_MENU_PRODUCTS).valid).toBe(false);
    expect(validation.validateCombo(comboDefinition(), [{ slotId: 'combo-burger', selectedProductIds: ['product-1'] }], MOCK_MENU_PRODUCTS).valid).toBe(false);
    expect(validation.validateCombo(comboDefinition(), [{ slotId: 'combo-side', selectedProductIds: ['product-4'] }], MOCK_MENU_PRODUCTS).valid).toBe(false);
    expect(validation.validateCombo(comboDefinition(), [{ slotId: 'combo-burger', selectedProductIds: ['product-12', 'product-7'] }], MOCK_MENU_PRODUCTS).valid).toBe(false);
  });

  it('defines required combo slots with min, max and default products in mock data', () => {
    expect(combo().type).toBe('combo');
    expect(combo().comboDefinitionId).toBe('combo-classic-burger-menu');
    expect(comboDefinition().slots).toEqual([
      expect.objectContaining({ id: 'combo-burger', required: true, minSelections: 1, maxSelections: 1, defaultProductId: 'product-12' }),
      expect.objectContaining({ id: 'combo-side', required: true, minSelections: 1, maxSelections: 1, defaultProductId: 'product-13' }),
      expect.objectContaining({ id: 'combo-drink', required: true, minSelections: 1, maxSelections: 1, defaultProductId: 'product-14' }),
    ]);
  });
});
