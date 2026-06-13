import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { MOCK_MENU_PRODUCTS, MOCK_MODIFIER_GROUPS } from '../../services/menu-mock.service';
import { ProductCustomizerDialog } from './product-customizer-dialog';

describe('ProductCustomizerDialog', () => {
  it('renders modifier groups, updates price and emits the customization', async () => {
    const i18n = provideI18nTesting('en');
    const product = MOCK_MENU_PRODUCTS.find((currentProduct) => currentProduct.id === 'product-1')!;
    const modifierGroups = MOCK_MODIFIER_GROUPS.filter((group) => product.modifierGroupIds.includes(group.id));
    const confirmed = vi.fn();

    await render(
      '<app-product-customizer-dialog open [product]="product" [modifierGroups]="modifierGroups" (confirmed)="confirmed($event)" />',
      {
        imports: [...i18n.imports, ProductCustomizerDialog],
        providers: [...i18n.providers],
        componentProperties: { product, modifierGroups, confirmed },
      },
    );

    const dialog = screen.getByRole('dialog', { name: /Craft Burger/i });
    fireEvent.click(within(dialog).getByLabelText(/Bacon/i));
    fireEvent.click(within(dialog).getByLabelText(/Cheese/i));
    fireEvent.click(within(dialog).getByLabelText(/NO Onion/i));
    fireEvent.input(within(dialog).getByRole('textbox'), { target: { value: 'Little done' } });

    const addButton = within(dialog).getByRole('button', { name: /15,00|Add/i });
    expect(addButton).toBeTruthy();
    fireEvent.click(addButton);

    expect(confirmed).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        selectedModifierOptionIds: expect.arrayContaining(['extra-bacon', 'extra-cheese', 'remove-onion']),
        kitchenNote: 'Little done',
      }),
    );
  });
});
