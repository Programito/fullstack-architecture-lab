import { fireEvent, render, screen } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { MOCK_COMBO_PRODUCT_DEFINITIONS, MOCK_MENU_PRODUCTS } from '../../services/menu-mock.service';
import { ComboCustomizerDialog } from './combo-customizer-dialog';

describe('ComboCustomizerDialog', () => {
  const comboProduct = MOCK_MENU_PRODUCTS.find((product) => product.id === 'product-16')!;
  const comboDefinition = MOCK_COMBO_PRODUCT_DEFINITIONS.find((definition) => definition.productId === comboProduct.id)!;

  const renderDialog = async (products = MOCK_MENU_PRODUCTS) => {
    const i18n = provideI18nTesting('en');
    const confirmed = vi.fn();

    const { fixture } = await render(ComboCustomizerDialog, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        open: true,
        comboProduct,
        comboDefinition,
        products,
      },
    });
    fixture.componentInstance.confirmed.subscribe(confirmed);

    return { fixture, confirmed };
  };

  it('preselects default products and emits the selected slot configuration', async () => {
    const { confirmed } = await renderDialog();

    expect((screen.getByRole('radio', { name: /Classic Burger/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: /Fries/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: /Coca-Cola/i }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('Menu total')).toBeTruthy();
    expect(screen.getAllByText('€13.50').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Add menu' }));

    expect(confirmed).toHaveBeenCalledWith({
      comboProductId: 'product-16',
      slotSelections: [
        { slotId: 'combo-burger', selectedProductIds: ['product-12'] },
        { slotId: 'combo-side', selectedProductIds: ['product-13'] },
        { slotId: 'combo-drink', selectedProductIds: ['product-14'] },
      ],
    });
  });

  it('updates total when a premium slot product is selected', async () => {
    await renderDialog();

    fireEvent.click(screen.getByRole('radio', { name: /Truffle Burger/i }));

    expect(screen.getByText('€15.50')).toBeTruthy();
  });

  it('keeps unavailable products disabled and prevents invalid confirmation', async () => {
    const unavailableProducts = MOCK_MENU_PRODUCTS.map((product) => (product.id === 'product-12' ? { ...product, available: false } : product));
    const invalidDefinition = {
      ...comboDefinition,
      slots: [{ ...comboDefinition.slots[0], allowedProductIds: ['product-12'], defaultProductId: 'product-12' }],
    };
    const i18n = provideI18nTesting('en');

    await render(ComboCustomizerDialog, {
      imports: [...i18n.imports],
      providers: [...i18n.providers],
      inputs: {
        open: true,
        comboProduct,
        comboDefinition: invalidDefinition,
        products: unavailableProducts,
      },
    });

    expect(screen.getByText('No products are available for this slot.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add menu' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Complete the required slots to add the menu.')).toBeTruthy();
  });
});
