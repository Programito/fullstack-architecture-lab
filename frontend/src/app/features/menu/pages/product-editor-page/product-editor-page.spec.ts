import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { render, screen, fireEvent, within } from '@testing-library/angular';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { RestaurantContextStore } from '../../../restaurant-pos/state/restaurant-context.store';
import type { ModifierGroup } from '../../models/modifier-group.model';
import { MenuApiService, type MenuData, type RestaurantProductDetailDto } from '../../services/menu-api.service';
import { ProductImageUploadError, ProductImageUploadService } from '../../services/product-image-upload.service';
import { ToastService } from '../../../../shared/ui/toast/toast';
import { ProductEditorPage } from './product-editor-page';

const ACTIVE_RESTAURANT = {
  id: 'r1',
  name: 'MesaFlow Demo',
  displayName: 'MesaFlow Demo',
  timezone: 'Europe/Madrid',
  currency: 'EUR',
  isActive: true,
};

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

const MOCK_MENU_DATA: MenuData = {
  menuId: 'menu-1',
  categories: [],
  products: [],
  modifierGroups: [],
  comboProductDefinitions: [],
};

describe('ProductEditorPage', () => {
  const uploadProductImage = vi.fn();
  const getProduct = vi.fn();
  const getMenu = vi.fn();
  const listModifierGroups = vi.fn();
  const listProducts = vi.fn();
  const createProduct = vi.fn();
  const updateProduct = vi.fn();
  const navigateByUrl = vi.fn(async () => true);
  const toastSuccess = vi.fn();
  const toastDanger = vi.fn();

  const renderPage = async (productId: string | null) => {
    const i18n = provideI18nTesting('es');
    const route = { snapshot: { paramMap: convertToParamMap(productId ? { productId } : {}) } };

    return render(ProductEditorPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: { navigateByUrl } },
        {
          provide: MenuApiService,
          useValue: { getProduct, getMenu, listModifierGroups, listProducts, createProduct, updateProduct },
        },
        { provide: ProductImageUploadService, useValue: { uploadProductImage } },
        { provide: ToastService, useValue: { success: toastSuccess, danger: toastDanger } },
        { provide: RestaurantContextStore, useValue: { activeRestaurant: signal(ACTIVE_RESTAURANT).asReadonly() } },
      ],
    });
  };

  beforeEach(() => {
    uploadProductImage.mockReset();
    getProduct.mockReset();
    getMenu.mockReset().mockReturnValue(of(MOCK_MENU_DATA));
    listModifierGroups.mockReset().mockReturnValue(of(MOCK_MODIFIER_GROUPS));
    listProducts.mockReset().mockReturnValue(of([]));
    createProduct.mockReset();
    updateProduct.mockReset();
    navigateByUrl.mockClear();
    toastSuccess.mockClear();
    toastDanger.mockClear();
  });

  it('shows create title when there is no productId route param', async () => {
    await renderPage(null);
    expect(screen.getByRole('heading', { name: /Nuevo producto/i })).toBeTruthy();
  });

  it('shows edit title and loads the product when productId is present', async () => {
    getProduct.mockReturnValue(of(MOCK_PRODUCT));
    await renderPage('rp-1');

    expect(getProduct).toHaveBeenCalledWith('rp-1');
    expect(await screen.findByRole('heading', { name: /Editar producto/i })).toBeTruthy();
  });

  it('pre-fills name and price in edit mode', async () => {
    getProduct.mockReturnValue(of(MOCK_PRODUCT));
    await renderPage('rp-1');

    const nameInput = (await screen.findByRole('textbox', { name: /Nombre/i })) as HTMLInputElement;
    expect(nameInput.value).toBe('Hamburguesa craft');
    const priceInput = screen.getByRole('spinbutton', { name: /Precio/i }) as HTMLInputElement;
    expect(priceInput.value).toBe('14.90');
  });

  it('pre-fills selected modifier groups and allergens in edit mode', async () => {
    getProduct.mockReturnValue(of(MOCK_PRODUCT));
    await renderPage('rp-1');

    expect((await screen.findByRole('checkbox', { name: /Extras de hamburguesa/i })) as HTMLInputElement).toBeTruthy();
    expect((screen.getByRole('checkbox', { name: /Extras de hamburguesa/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /^Gluten$/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /^Pescado$/i }) as HTMLInputElement).checked).toBe(false);
  });

  it('disables save when name is empty in create mode', async () => {
    await renderPage(null);
    const btn = screen.getByRole('button', { name: /Crear producto/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('creates a product and navigates back to the menu on save', async () => {
    createProduct.mockReturnValue(of(MOCK_PRODUCT));
    await renderPage(null);

    fireEvent.input(screen.getByRole('textbox', { name: /Nombre/i }), { target: { value: 'Bocadillo' } });
    fireEvent.input(screen.getByRole('spinbutton', { name: /Precio/i }), { target: { value: '5.50' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear producto/i }));

    expect(createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Bocadillo', priceCents: 550, currency: 'EUR' }),
    );
    expect(navigateByUrl).toHaveBeenCalledWith('/restaurant-pos/menu');
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('updates a product and navigates back to the menu on save', async () => {
    getProduct.mockReturnValue(of(MOCK_PRODUCT));
    updateProduct.mockReturnValue(of(MOCK_PRODUCT));
    await renderPage('rp-1');

    const nameInput = await screen.findByRole('textbox', { name: /Nombre/i });
    fireEvent.input(nameInput, { target: { value: 'Hamburguesa premium' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    expect(updateProduct).toHaveBeenCalledWith(
      'rp-1',
      expect.objectContaining({ name: 'Hamburguesa premium', isAvailable: true }),
    );
    expect(navigateByUrl).toHaveBeenCalledWith('/restaurant-pos/menu');
  });

  it('shows an error toast and stays on the page when save fails', async () => {
    createProduct.mockReturnValue(throwError(() => new Error('boom')));
    await renderPage(null);

    fireEvent.input(screen.getByRole('textbox', { name: /Nombre/i }), { target: { value: 'Bocadillo' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear producto/i }));

    expect(toastDanger).toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('navigates back to the menu without saving when cancel is pressed', async () => {
    await renderPage(null);

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

    expect(createProduct).not.toHaveBeenCalled();
    expect(navigateByUrl).toHaveBeenCalledWith('/restaurant-pos/menu');
  });

  it('stores the uploaded URL after a successful upload', async () => {
    uploadProductImage.mockReturnValueOnce(of('https://res.cloudinary.com/demo/image/upload/v1/new-burger.jpg'));
    await renderPage(null);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image'], 'burger.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(uploadProductImage).toHaveBeenCalledWith(file);
    const preview = await screen.findByRole('img', { name: /imagen/i });
    expect((preview as HTMLImageElement).src).toContain('new-burger.jpg');
  });

  it('shows a validation message and allows retry after a failed upload', async () => {
    uploadProductImage.mockReturnValueOnce(throwError(() => new ProductImageUploadError('file-too-large', 'too large')));
    await renderPage(null);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image'], 'huge.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText(/demasiado pesada/i)).toBeTruthy();

    uploadProductImage.mockReturnValueOnce(of('https://res.cloudinary.com/demo/image/upload/v1/retried.jpg'));
    fireEvent.click(screen.getByRole('button', { name: /reintentar subida/i }));

    expect(uploadProductImage).toHaveBeenNthCalledWith(2, file);
    expect((await screen.findByRole('img', { name: /imagen/i }) as HTMLImageElement).src).toContain('retried.jpg');
  });

  it('shows a spinner while loading the product in edit mode', async () => {
    const pending = new Subject<RestaurantProductDetailDto>();
    getProduct.mockReturnValue(pending);
    await renderPage('rp-1');

    expect(screen.queryByRole('textbox', { name: /Nombre/i })).toBeNull();

    pending.next(MOCK_PRODUCT);
    pending.complete();

    expect(await screen.findByRole('textbox', { name: /Nombre/i })).toBeTruthy();
  });

  it('navigates back to the menu and shows an error toast when loading the product fails', async () => {
    getProduct.mockReturnValue(throwError(() => new Error('boom')));
    await renderPage('rp-1');

    expect(navigateByUrl).toHaveBeenCalledWith('/restaurant-pos/menu');
    expect(toastDanger).toHaveBeenCalled();
  });

  it('emits imageUrl null after removing the image in edit mode', async () => {
    getProduct.mockReturnValue(of(MOCK_PRODUCT));
    updateProduct.mockReturnValue(of(MOCK_PRODUCT));
    await renderPage('rp-1');

    fireEvent.click(await screen.findByRole('button', { name: /quitar imagen/i }));
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(updateProduct).toHaveBeenCalledWith('rp-1', expect.objectContaining({ imageUrl: null }));
  });
});
