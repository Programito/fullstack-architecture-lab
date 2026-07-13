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
  categories: [{ id: 'cat-1', name: 'Principales', sortOrder: 1 }],
  products: [
    {
      id: 'item-rp-1',
      restaurantProductId: 'rp-1',
      name: 'Hamburguesa craft',
      categoryId: 'cat-1',
      basePrice: 14.9,
      available: true,
      course: 'main',
      type: 'simple',
      modifierGroupIds: [],
      preparationPolicy: { route: 'kitchen', requiresReadyBeforeServe: true },
    },
  ],
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
  const createModifierGroup = vi.fn();
  const updateModifierGroup = vi.fn();
  const addSectionItem = vi.fn();
  const removeSectionItem = vi.fn();
  const navigateByUrl = vi.fn(async () => true);
  const toastSuccess = vi.fn();
  const toastDanger = vi.fn();

  const renderPage = async (productId: string | null, lang: 'es' | 'en' | 'ca' = 'es') => {
    const i18n = provideI18nTesting(lang);
    const route = { snapshot: { paramMap: convertToParamMap(productId ? { productId } : {}) } };

    return render(ProductEditorPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: { navigateByUrl } },
        {
          provide: MenuApiService,
          useValue: {
            getProduct,
            getMenu,
            listModifierGroups,
            listProducts,
            createProduct,
            updateProduct,
            createModifierGroup,
            updateModifierGroup,
            addSectionItem,
            removeSectionItem,
          },
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
    createModifierGroup.mockReset();
    updateModifierGroup.mockReset();
    addSectionItem.mockReset().mockReturnValue(of(undefined));
    removeSectionItem.mockReset().mockReturnValue(of(undefined));
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

    const nameInput = (await screen.findByRole('textbox', { name: /^Nombre principal$/i })) as HTMLInputElement;
    expect(nameInput.value).toBe('Hamburguesa craft');
    const priceInput = screen.getByRole('spinbutton', { name: /Precio/i }) as HTMLInputElement;
    expect(priceInput.value).toBe('14.90');
  });

  /* Legacy order test kept here only as historical reference after the locale-order refactor.
  it('pre-fills the per-language name/description fields from nameI18n/descriptionI18n, switching via the language segment', async () => {
    getProduct.mockReturnValue(
      of({
        ...MOCK_PRODUCT,
        nameI18n: { ca: 'Hamburguesa artesana', en: 'Craft burger', es: 'Hamburguesa artesanal' },
        descriptionI18n: { ca: 'Amb cheddar i bacon', en: 'With cheddar and bacon', es: 'Con queso cheddar y beicon' },
      }),
    );
    await renderPage('rp-1');

    // El segment arranca en catalán (primer idioma de la lista).
    expect(((await screen.findByRole('textbox', { name: /Nombre \(catalán\)/i })) as HTMLInputElement).value).toBe(
      'Hamburguesa artesana',
    );
    expect((screen.getByRole('textbox', { name: /Descripción \(catalán\)/i }) as HTMLTextAreaElement).value).toBe(
      'Amb cheddar i bacon',
    );

    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    expect((screen.getByRole('textbox', { name: /Nombre \(inglés\)/i }) as HTMLInputElement).value).toBe('Craft burger');
    expect((screen.getByRole('textbox', { name: /Descripción \(inglés\)/i }) as HTMLTextAreaElement).value).toBe(
      'With cheddar and bacon',
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Español' }));
    expect((screen.getByRole('textbox', { name: /Nombre \(castellano\)/i }) as HTMLInputElement).value).toBe(
      'Hamburguesa artesanal',
    );
    expect((screen.getByRole('textbox', { name: /Descripción \(castellano\)/i }) as HTMLTextAreaElement).value).toBe(
      'Con queso cheddar y beicon',
    );
  });
  */

  it('uses the same desktop translation order for product and defaults the visible product translation to Spanish', async () => {
    getProduct.mockReturnValue(
      of({
        ...MOCK_PRODUCT,
        nameI18n: { ca: 'Hamburguesa artesana', en: 'Craft burger', es: 'Hamburguesa artesanal' },
        descriptionI18n: { ca: 'Amb cheddar i bacon', en: 'With cheddar and bacon', es: 'Con queso cheddar y beicon' },
      }),
    );
    await renderPage('rp-1');

    expect(screen.getAllByRole('radio').slice(0, 3).map((radio) => radio.textContent?.trim())).toEqual(['Español', 'English', 'Català']);
    expect(((await screen.findByRole('textbox', { name: /Nombre \(castellano\)/i })) as HTMLInputElement).value).toBe(
      'Hamburguesa artesanal',
    );
    expect((screen.getByRole('textbox', { name: /Descripci.n \(castellano\)/i }) as HTMLTextAreaElement).value).toBe(
      'Con queso cheddar y beicon',
    );

    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    expect((screen.getByRole('textbox', { name: /Nombre \(ingl.s\)/i }) as HTMLInputElement).value).toBe('Craft burger');

    fireEvent.click(screen.getByRole('radio', { name: 'Català' }));
    expect((screen.getByRole('textbox', { name: /Nombre \(catal.n\)/i }) as HTMLInputElement).value).toBe('Hamburguesa artesana');
  });

  it('sends nameI18n.es/descriptionI18n.es when filled in via the Spanish segment and omits empty languages', async () => {
    createProduct.mockReturnValue(of(MOCK_PRODUCT));
    await renderPage(null);

    fireEvent.input(screen.getByRole('textbox', { name: /^Nombre principal$/i }), { target: { value: 'Bocadillo' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Español' }));
    fireEvent.input(screen.getByRole('textbox', { name: /Nombre \(castellano\)/i }), { target: { value: 'Bocata mixto' } });
    fireEvent.input(screen.getByRole('textbox', { name: /Descripción \(castellano\)/i }), {
      target: { value: 'Bocata de jamón y queso' },
    });
    fireEvent.change(await screen.findByRole('combobox', { name: /Categoría/i }), { target: { value: 'cat-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear producto/i }));

    expect(createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Bocadillo',
        nameI18n: { es: 'Bocata mixto' },
        descriptionI18n: { es: 'Bocata de jamón y queso' },
      }),
    );
  });

  /* Obsolete after the supplement locale-segment refactor.
    createProduct.mockReturnValue(of(MOCK_PRODUCT));
    createModifierGroup.mockReturnValue(of({ id: 'sg-1' }));
    updateProduct.mockReturnValue(of(MOCK_PRODUCT));
    await renderPage(null);

    fireEvent.input(screen.getByRole('textbox', { name: /^Nombre principal$/i }), { target: { value: 'Bocadillo' } });
    fireEvent.click(screen.getByRole('button', { name: /Añadir suplemento/i }));

    fireEvent.input(screen.getByPlaceholderText('Nombre del suplemento'), { target: { value: 'Bacon extra' } });
    fireEvent.input(screen.getByPlaceholderText('Precio (€)'), { target: { value: '1.5' } });
    // El label "Nombre (catalán)" también lo usa el campo de traducción del nombre principal
    // (segment de idioma); se acota la búsqueda a la tarjeta del propio suplemento.
    const supplementCard = screen.getByPlaceholderText('Nombre del suplemento').closest('.rounded-xl') as HTMLElement;
    fireEvent.input(within(supplementCard).getByRole('textbox', { name: /Nombre \(catalán\)/i }), {
      target: { value: 'Bacon extra CA' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Crear producto/i }));

    expect(createModifierGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'product',
        ownerRestaurantProductId: 'rp-1',
        options: [
          expect.objectContaining({
            name: 'Bacon extra',
            nameI18n: { ca: 'Bacon extra CA' },
            priceDeltaCents: 150,
          }),
        ],
      }),
    );
  });

  */
  it('creates a supplement group using the supplement locale segment for Catalan', async () => {
    createProduct.mockReturnValue(of(MOCK_PRODUCT));
    createModifierGroup.mockReturnValue(of({ id: 'sg-1' }));
    updateProduct.mockReturnValue(of(MOCK_PRODUCT));
    await renderPage(null);

    fireEvent.input(screen.getByRole('textbox', { name: /^Nombre principal$/i }), { target: { value: 'Bocadillo' } });
    fireEvent.click(screen.getAllByRole('button').find((button) => /suplemento/i.test(button.textContent ?? '')) as HTMLButtonElement);

    const supplementInput = screen.getByPlaceholderText('Nombre del suplemento');
    const supplementCard = supplementInput.closest('.rounded-xl') as HTMLElement;

    fireEvent.input(within(supplementCard).getByRole('textbox', { name: /^Nombre principal$/i }), {
      target: { value: 'Bacon extra' },
    });
    fireEvent.input(within(supplementCard).getByRole('spinbutton', { name: /Precio/i }), {
      target: { value: '1.5' },
    });
    fireEvent.click(within(supplementCard).getByRole('radio', { name: 'Català' }));
    fireEvent.input(within(supplementCard).getAllByRole('textbox').at(-1) as HTMLInputElement, {
      target: { value: 'Bacon extra CA' },
    });

    fireEvent.change(screen.getByRole('combobox', { name: /Categoría/i }), { target: { value: 'cat-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear producto/i }));

    expect(createModifierGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'product',
        ownerRestaurantProductId: 'rp-1',
        options: [
          expect.objectContaining({
            name: 'Bacon extra',
            nameI18n: { ca: 'Bacon extra CA' },
            priceDeltaCents: 150,
          }),
        ],
      }),
    );
  });

  /* Replaced by the stable supplement-card locale test below.
    createProduct.mockReturnValue(of(MOCK_PRODUCT));
    createModifierGroup.mockReturnValue(of({ id: 'sg-1' }));
    updateProduct.mockReturnValue(of(MOCK_PRODUCT));
    await renderPage(null);

    fireEvent.input(screen.getByRole('textbox', { name: /^Nombre principal$/i }), { target: { value: 'Bocadillo' } });
    fireEvent.click(screen.getByRole('button', { name: /AÃ±adir suplemento/i }));

    fireEvent.input(screen.getByRole('textbox', { name: /^Nombre principal$/i, hidden: true }), { target: { value: 'Bacon extra' } });
    const supplementCard = screen.getByText(/Bacon extra/i).closest('.rounded-xl') as HTMLElement;

    fireEvent.click(within(supplementCard).getByRole('radio', { name: 'English' }));
    fireEvent.input(within(supplementCard).getByRole('textbox', { name: /Nombre \(inglÃ©s\)/i }), {
      target: { value: 'Extra bacon EN' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Crear producto/i }));

    expect(createModifierGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [
          expect.objectContaining({
            name: 'Bacon extra',
            nameI18n: { en: 'Extra bacon EN' },
          }),
        ],
      }),
    );
  });

  */
  it('stores the active supplement translation when English is selected in the supplement card', async () => {
    createProduct.mockReturnValue(of(MOCK_PRODUCT));
    createModifierGroup.mockReturnValue(of({ id: 'sg-1' }));
    updateProduct.mockReturnValue(of(MOCK_PRODUCT));
    await renderPage(null);

    fireEvent.input(screen.getByRole('textbox', { name: /^Nombre principal$/i }), { target: { value: 'Bocadillo' } });
    fireEvent.click(screen.getAllByRole('button').find((button) => /suplemento/i.test(button.textContent ?? '')) as HTMLButtonElement);

    const supplementInput = screen.getByPlaceholderText('Nombre del suplemento');
    const supplementCard = supplementInput.closest('.rounded-xl') as HTMLElement;

    fireEvent.input(within(supplementCard).getByRole('textbox', { name: /^Nombre principal$/i }), {
      target: { value: 'Bacon extra' },
    });
    fireEvent.click(within(supplementCard).getByRole('radio', { name: 'English' }));
    fireEvent.input(within(supplementCard).getAllByRole('textbox').at(-1) as HTMLInputElement, {
      target: { value: 'Extra bacon EN' },
    });

    fireEvent.change(screen.getByRole('combobox', { name: /Categoría/i }), { target: { value: 'cat-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Crear producto/i }));

    expect(createModifierGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [
          expect.objectContaining({
            name: 'Bacon extra',
            nameI18n: { en: 'Extra bacon EN' },
          }),
        ],
      }),
    );
  });

  /* Replaced by the segment-driven edit-mode translation prefill test below.
    getProduct.mockReturnValue(of(MOCK_PRODUCT));
    listModifierGroups.mockImplementation((scope?: string) =>
      scope === 'product'
        ? of([
            {
              id: 'sg-1',
              name: 'Suplementos — Hamburguesa craft',
              type: 'multiple',
              required: false,
              minSelections: 0,
              maxSelections: 1,
              ownerRestaurantProductId: 'rp-1',
              options: [
                {
                  id: 'opt-bacon-extra',
                  name: 'Bacon extra',
                  nameI18n: { ca: 'Bacon extra CA', en: 'Extra bacon EN' },
                  priceDelta: 1.5,
                },
              ],
            },
          ])
        : of(MOCK_MODIFIER_GROUPS),
    );
    await renderPage('rp-1');

    const supplementNameInput = await screen.findByPlaceholderText('Nombre del suplemento');
    const supplementCard = supplementNameInput.closest('.rounded-xl') as HTMLElement;
    expect(
      (within(supplementCard).getByRole('textbox', { name: /Nombre \(catalán\)/i }) as HTMLInputElement).value,
    ).toBe('Bacon extra CA');
    expect(
      (within(supplementCard).getByRole('textbox', { name: /Nombre \(inglés\)/i }) as HTMLInputElement).value,
    ).toBe('Extra bacon EN');
  });

  */
  it('pre-fills supplement translations through the locale segment in edit mode', async () => {
    getProduct.mockReturnValue(
      of({
        ...MOCK_PRODUCT,
        modifierGroups: [
          {
            id: 'sg-1',
            name: 'Suplementos',
            type: 'multiple',
            required: false,
            minSelections: 0,
            maxSelections: 0,
            options: [
              {
                id: 'opt-sup',
                name: 'Bacon extra',
                nameI18n: { ca: 'Bacon extra CA', en: 'Extra bacon EN' },
                priceDelta: 1.5,
              },
            ],
          },
        ],
      }),
    );
    listModifierGroups.mockReturnValue(
      of([
        {
          id: 'sg-1',
          name: 'Suplementos',
          scope: 'product',
          ownerRestaurantProductId: 'rp-1',
          type: 'multiple',
          required: false,
          minSelections: 0,
          maxSelections: 0,
          options: [
            {
              id: 'opt-sup',
              name: 'Bacon extra',
              nameI18n: { ca: 'Bacon extra CA', en: 'Extra bacon EN' },
              priceDelta: 1.5,
            },
          ],
        },
      ]),
    );
    await renderPage('rp-1');

    const supplementNameInput = await screen.findByPlaceholderText('Nombre del suplemento');
    const supplementCard = supplementNameInput.closest('.rounded-xl') as HTMLElement;

    expect((within(supplementCard).getAllByRole('textbox').at(-1) as HTMLInputElement).value).toBe('');
    fireEvent.click(within(supplementCard).getByRole('radio', { name: 'Català' }));
    expect((within(supplementCard).getAllByRole('textbox').at(-1) as HTMLInputElement).value).toBe('Bacon extra CA');
    fireEvent.click(within(supplementCard).getByRole('radio', { name: 'English' }));
    expect((within(supplementCard).getAllByRole('textbox').at(-1) as HTMLInputElement).value).toBe('Extra bacon EN');
  });

  it('pre-fills selected modifier groups and allergens in edit mode', async () => {
    getProduct.mockReturnValue(of(MOCK_PRODUCT));
    await renderPage('rp-1');

    expect((await screen.findByRole('checkbox', { name: /Extras de hamburguesa/i })) as HTMLInputElement).toBeTruthy();
    expect((screen.getByRole('checkbox', { name: /Extras de hamburguesa/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /^Gluten$/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /^Pescado$/i }) as HTMLInputElement).checked).toBe(false);
  });

  it('shows translated modifier group names using the active language when nameI18n is available', async () => {
    getProduct.mockReturnValue(of(MOCK_PRODUCT));
    listModifierGroups.mockReturnValue(
      of([
        {
          ...MOCK_MODIFIER_GROUPS[0],
          nameI18n: { en: 'Burger extras' },
        },
        {
          ...MOCK_MODIFIER_GROUPS[1],
          nameI18n: { en: 'Patty doneness' },
        },
      ]),
    );

    await renderPage('rp-1', 'en');

    expect(await screen.findByRole('checkbox', { name: /Burger extras/i })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /Extras de hamburguesa/i })).toBeNull();
  });

  it('shows a spinner while modifier groups are loading and renders them once available', async () => {
    const pendingGroups = new Subject<ModifierGroup[]>();
    listModifierGroups.mockReturnValue(pendingGroups);
    await renderPage(null, 'en');

    expect(screen.getByRole('status', { name: /cargando/i })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /Burger extras/i })).toBeNull();

    pendingGroups.next([
      {
        ...MOCK_MODIFIER_GROUPS[0],
        nameI18n: { en: 'Burger extras' },
      },
    ]);
    pendingGroups.complete();

    expect(await screen.findByRole('checkbox', { name: /Burger extras/i })).toBeTruthy();
  });

  it('disables save when name is empty in create mode', async () => {
    await renderPage(null);
    const btn = screen.getByRole('button', { name: /Crear producto/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('creates a product and navigates back to the menu on save', async () => {
    createProduct.mockReturnValue(of(MOCK_PRODUCT));
    await renderPage(null);

    fireEvent.input(screen.getByRole('textbox', { name: /^Nombre principal$/i }), { target: { value: 'Bocadillo' } });
    fireEvent.input(screen.getByRole('spinbutton', { name: /Precio/i }), { target: { value: '5.50' } });
    fireEvent.change(await screen.findByRole('combobox', { name: /Categoría/i }), { target: { value: 'cat-1' } });
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

    const nameInput = await screen.findByRole('textbox', { name: /^Nombre principal$/i });
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

    fireEvent.input(screen.getByRole('textbox', { name: /^Nombre principal$/i }), { target: { value: 'Bocadillo' } });
    fireEvent.change(await screen.findByRole('combobox', { name: /Categoría/i }), { target: { value: 'cat-1' } });
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

    expect(screen.queryByRole('textbox', { name: /^Nombre principal$/i })).toBeNull();

    pending.next(MOCK_PRODUCT);
    pending.complete();

    expect(await screen.findByRole('textbox', { name: /^Nombre principal$/i })).toBeTruthy();
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
