import { fireEvent, render, screen, within } from '@testing-library/angular';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import type { RestaurantProductDetailDto } from '../../services/menu-api.service';
import { ProductFormDialog } from './product-form-dialog';

const MOCK_PRODUCT: RestaurantProductDetailDto = {
  id: 'rp-1',
  productId: 'p-1',
  organizationId: 'org-1',
  name: 'Hamburguesa craft',
  displayName: null,
  description: 'Con cheddar y bacon',
  displayDescription: null,
  productType: 'simple',
  course: 'main',
  preparationRoute: 'kitchen',
  preparationRouteOverride: null,
  priceCents: 1490,
  currency: 'EUR',
  isAvailable: true,
  isVisible: true,
};

describe('ProductFormDialog', () => {
  it('shows create title when no product is provided', async () => {
    const i18n = provideI18nTesting('es');
    await render('<app-product-form-dialog open [product]="null" />', {
      imports: [...i18n.imports, ProductFormDialog],
      providers: [...i18n.providers],
      componentProperties: { product: null },
    });
    expect(screen.getByRole('dialog', { name: /Nuevo producto/i })).toBeTruthy();
  });

  it('shows edit title when a product is provided', async () => {
    const i18n = provideI18nTesting('es');
    await render('<app-product-form-dialog open [product]="product" />', {
      imports: [...i18n.imports, ProductFormDialog],
      providers: [...i18n.providers],
      componentProperties: { product: MOCK_PRODUCT },
    });
    expect(screen.getByRole('dialog', { name: /Editar producto/i })).toBeTruthy();
  });

  it('pre-fills name and price in edit mode', async () => {
    const i18n = provideI18nTesting('es');
    await render('<app-product-form-dialog open [product]="product" />', {
      imports: [...i18n.imports, ProductFormDialog],
      providers: [...i18n.providers],
      componentProperties: { product: MOCK_PRODUCT },
    });
    const nameInput = screen.getByRole('textbox', { name: /Nombre/i }) as HTMLInputElement;
    expect(nameInput.value).toBe('Hamburguesa craft');
    const priceInput = screen.getByRole('spinbutton', { name: /Precio/i }) as HTMLInputElement;
    expect(priceInput.value).toBe('14.90');
  });

  it('disables confirm button when name is empty in create mode', async () => {
    const i18n = provideI18nTesting('es');
    await render('<app-product-form-dialog open [product]="null" />', {
      imports: [...i18n.imports, ProductFormDialog],
      providers: [...i18n.providers],
      componentProperties: { product: null },
    });
    const dialog = screen.getByRole('dialog');
    const btn = within(dialog).getByRole('button', { name: /Crear producto/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('emits confirmed with CreateProductInput on submit in create mode', async () => {
    const i18n = provideI18nTesting('es');
    const confirmed = vi.fn();
    await render('<app-product-form-dialog open [product]="null" (confirmed)="confirmed($event)" />', {
      imports: [...i18n.imports, ProductFormDialog],
      providers: [...i18n.providers],
      componentProperties: { product: null, confirmed },
    });

    const dialog = screen.getByRole('dialog');
    fireEvent.input(within(dialog).getByRole('textbox', { name: /Nombre/i }), { target: { value: 'Bocadillo' } });
    fireEvent.input(within(dialog).getByRole('spinbutton', { name: /Precio/i }), { target: { value: '5.50' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Crear producto/i }));

    expect(confirmed).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Bocadillo',
        priceCents: 550,
        currency: 'EUR',
        course: 'main',
        preparationRoute: 'kitchen',
      }),
    );
  });

  it('emits confirmed with UpdateProductInput on submit in edit mode', async () => {
    const i18n = provideI18nTesting('es');
    const confirmed = vi.fn();
    await render('<app-product-form-dialog open [product]="product" (confirmed)="confirmed($event)" />', {
      imports: [...i18n.imports, ProductFormDialog],
      providers: [...i18n.providers],
      componentProperties: { product: MOCK_PRODUCT, confirmed },
    });

    const dialog = screen.getByRole('dialog');
    const nameInput = within(dialog).getByRole('textbox', { name: /Nombre/i });
    fireEvent.input(nameInput, { target: { value: 'Hamburguesa premium' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Guardar/i }));

    expect(confirmed).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Hamburguesa premium',
        priceCents: 1490,
        isAvailable: true,
      }),
    );
  });

  it('emits closed on cancel', async () => {
    const i18n = provideI18nTesting('es');
    const closed = vi.fn();
    await render('<app-product-form-dialog open [product]="null" (closed)="closed()" />', {
      imports: [...i18n.imports, ProductFormDialog],
      providers: [...i18n.providers],
      componentProperties: { product: null, closed },
    });

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Cancelar/i }));
    expect(closed).toHaveBeenCalled();
  });
});
