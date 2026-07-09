import { fireEvent, render, screen, within } from '@testing-library/angular';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import type { ModifierGroup } from '../../models/modifier-group.model';
import type { RestaurantProductDetailDto } from '../../services/menu-api.service';
import { ProductImageUploadError, ProductImageUploadService } from '../../services/product-image-upload.service';
import { ProductFormDialog } from './product-form-dialog';

const MOCK_PRODUCT: RestaurantProductDetailDto = {
  id: 'rp-1',
  productId: 'p-1',
  organizationId: 'org-1',
  name: 'Hamburguesa craft',
  displayName: null,
  imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/hamburguesa-craft.jpg',
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
  modifierGroupIds: ['burger-extras', 'burger-point'],
  allergens: ['gluten', 'milk'],
};

const MOCK_MODIFIER_GROUPS: ModifierGroup[] = [
  {
    id: 'burger-extras',
    name: 'Extras de hamburguesa',
    type: 'multiple',
    required: false,
    minSelections: 0,
    maxSelections: 3,
    options: [{ id: 'opt-bacon', name: 'Bacon', priceDelta: 1.5 }],
  },
  {
    id: 'burger-point',
    name: 'Punto de la carne',
    type: 'single',
    required: true,
    minSelections: 1,
    maxSelections: 1,
    options: [{ id: 'opt-medium', name: 'Al punto', priceDelta: 0 }],
  },
];

describe('ProductFormDialog', () => {
  const uploadProductImage = vi.fn();

  const renderDialog = async (componentProperties: Record<string, unknown>) => {
    const i18n = provideI18nTesting('es');
    return render('<app-product-form-dialog open [product]="product" [modifierGroups]="modifierGroups" (confirmed)="confirmed($event)" (closed)="closed()" />', {
      imports: [...i18n.imports, ProductFormDialog],
      providers: [
        ...i18n.providers,
        {
          provide: ProductImageUploadService,
          useValue: { uploadProductImage },
        },
      ],
      componentProperties: {
        product: null,
        modifierGroups: MOCK_MODIFIER_GROUPS,
        confirmed: vi.fn(),
        closed: vi.fn(),
        ...componentProperties,
      },
    });
  };

  beforeEach(() => {
    uploadProductImage.mockReset();
  });

  it('shows create title when no product is provided', async () => {
    await renderDialog({ product: null });
    expect(screen.getByRole('dialog', { name: /Nuevo producto/i })).toBeTruthy();
  });

  it('shows edit title when a product is provided', async () => {
    await renderDialog({ product: MOCK_PRODUCT });
    expect(screen.getByRole('dialog', { name: /Editar producto/i })).toBeTruthy();
  });

  it('pre-fills name and price in edit mode', async () => {
    await renderDialog({ product: MOCK_PRODUCT });
    const nameInput = screen.getByRole('textbox', { name: /Nombre/i }) as HTMLInputElement;
    expect(nameInput.value).toBe('Hamburguesa craft');
    const priceInput = screen.getByRole('spinbutton', { name: /Precio/i }) as HTMLInputElement;
    expect(priceInput.value).toBe('14.90');
  });

  it('pre-fills the current image in edit mode', async () => {
    await renderDialog({ product: MOCK_PRODUCT });

    const preview = screen.getByRole('img', { name: /Hamburguesa craft/i }) as HTMLImageElement;
    expect(preview.src).toContain('hamburguesa-craft.jpg');
  });

  it('shows the placeholder in create mode', async () => {
    await renderDialog({ product: null });

    expect(screen.getByText('Sin imagen')).toBeTruthy();
  });

  it('disables confirm button when name is empty in create mode', async () => {
    await renderDialog({ product: null });
    const dialog = screen.getByRole('dialog');
    const btn = within(dialog).getByRole('button', { name: /Crear producto/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('emits confirmed with CreateProductInput on submit in create mode', async () => {
    const confirmed = vi.fn();
    await renderDialog({ product: null, confirmed });

    const dialog = screen.getByRole('dialog');
    fireEvent.input(within(dialog).getByRole('textbox', { name: /Nombre/i }), { target: { value: 'Bocadillo' } });
    fireEvent.input(within(dialog).getByRole('spinbutton', { name: /Precio/i }), { target: { value: '5.50' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Crear producto/i }));

    expect(confirmed).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Bocadillo',
        imageUrl: null,
        modifierGroupIds: [],
        priceCents: 550,
        currency: 'EUR',
        course: 'main',
        preparationRoute: 'kitchen',
      }),
    );
  });

  it('emits confirmed with UpdateProductInput on submit in edit mode', async () => {
    const confirmed = vi.fn();
    await renderDialog({ product: MOCK_PRODUCT, confirmed });

    const dialog = screen.getByRole('dialog');
    const nameInput = within(dialog).getByRole('textbox', { name: /Nombre/i });
    fireEvent.input(nameInput, { target: { value: 'Hamburguesa premium' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Guardar/i }));

    expect(confirmed).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Hamburguesa premium',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/hamburguesa-craft.jpg',
        priceCents: 1490,
        isAvailable: true,
        modifierGroupIds: ['burger-extras', 'burger-point'],
      }),
    );
  });

  it('pre-fills selected modifier groups in edit mode', async () => {
    await renderDialog({ product: MOCK_PRODUCT });

    expect((screen.getByRole('checkbox', { name: /Extras de hamburguesa/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /Punto de la carne/i }) as HTMLInputElement).checked).toBe(true);
  });

  it('pre-fills selected allergens in edit mode', async () => {
    await renderDialog({ product: MOCK_PRODUCT });

    expect((screen.getByRole('checkbox', { name: /^Gluten$/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /^Leche$/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /^Pescado$/i }) as HTMLInputElement).checked).toBe(false);
  });

  it('toggles an allergen off when unchecked in edit mode', async () => {
    const confirmed = vi.fn();
    await renderDialog({ product: MOCK_PRODUCT, confirmed });

    fireEvent.click(screen.getByRole('checkbox', { name: /^Gluten$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    expect(confirmed).toHaveBeenCalledWith(expect.objectContaining({ allergens: ['milk'] }));
  });

  it('emits selected allergens when creating a product', async () => {
    const confirmed = vi.fn();
    await renderDialog({ product: null, confirmed });

    fireEvent.input(screen.getByRole('textbox', { name: /Nombre/i }), { target: { value: 'Bocadillo' } });
    fireEvent.input(screen.getByRole('spinbutton', { name: /Precio/i }), { target: { value: '5.50' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /^Gluten$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Crear producto/i }));

    expect(confirmed).toHaveBeenCalledWith(expect.objectContaining({ allergens: ['gluten'] }));
  });

  it('emits selected modifier groups when creating a product', async () => {
    const confirmed = vi.fn();
    await renderDialog({ product: null, confirmed });

    fireEvent.input(screen.getByRole('textbox', { name: /Nombre/i }), { target: { value: 'Bocadillo' } });
    fireEvent.input(screen.getByRole('spinbutton', { name: /Precio/i }), { target: { value: '5.50' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Extras de hamburguesa/i }));
    fireEvent.click(screen.getByRole('button', { name: /Crear producto/i }));

    expect(confirmed).toHaveBeenCalledWith(expect.objectContaining({ modifierGroupIds: ['burger-extras'] }));
  });

  it('stores the uploaded URL after a successful upload', async () => {
    uploadProductImage.mockReturnValueOnce(of('https://res.cloudinary.com/demo/image/upload/v1/new-burger.jpg'));
    await renderDialog({ product: null });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image'], 'burger.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(uploadProductImage).toHaveBeenCalledWith(file);
    const preview = await screen.findByRole('img', { name: /imagen/i });
    expect((preview as HTMLImageElement).src).toContain('new-burger.jpg');
  });

  it('emits imageUrl null after removing the image', async () => {
    const confirmed = vi.fn();
    await renderDialog({ product: MOCK_PRODUCT, confirmed });

    fireEvent.click(screen.getByRole('button', { name: /quitar imagen/i }));
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(confirmed).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: null,
      }),
    );
  });

  it('disables confirm while an image upload is in progress', async () => {
    const upload$ = new Subject<string>();
    uploadProductImage.mockReturnValueOnce(upload$);
    await renderDialog({ product: null });

    fireEvent.input(screen.getByRole('textbox', { name: /Nombre/i }), { target: { value: 'Bocadillo' } });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image'], 'burger.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const confirmButton = screen.getByRole('button', { name: /crear producto/i }) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);

    upload$.next('https://res.cloudinary.com/demo/image/upload/v1/burger.jpg');
    upload$.complete();
  });

  it('shows a validation message and allows retry after a failed upload', async () => {
    uploadProductImage
      .mockReturnValueOnce(throwError(() => new ProductImageUploadError('file-too-large', 'too large')));
    await renderDialog({ product: null });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image'], 'huge.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText(/demasiado pesada/i)).toBeTruthy();

    uploadProductImage.mockReturnValueOnce(of('https://res.cloudinary.com/demo/image/upload/v1/retried.jpg'));
    fireEvent.click(screen.getByRole('button', { name: /reintentar subida/i }));

    expect(uploadProductImage).toHaveBeenNthCalledWith(1, file);
    expect(uploadProductImage).toHaveBeenNthCalledWith(2, file);
    expect((await screen.findByRole('img', { name: /imagen/i }) as HTMLImageElement).src).toContain('retried.jpg');
  });

  it('clears the retry state when removing the image', async () => {
    const confirmed = vi.fn();
    await renderDialog({ product: MOCK_PRODUCT, confirmed });

    fireEvent.click(screen.getByRole('button', { name: /quitar imagen/i }));

    expect(screen.queryByRole('button', { name: /reintentar subida/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(confirmed).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: null }));
  });

  it('emits closed on cancel', async () => {
    const closed = vi.fn();
    await renderDialog({ product: null, closed });

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Cancelar/i }));
    expect(closed).toHaveBeenCalled();
  });
});
