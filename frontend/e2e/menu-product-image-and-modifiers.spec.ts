import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 1400 } });

const RESTAURANT_ID = 'r1';
const CLOUD_NAME = 'demo-cloud';
const UPLOADED_IMAGE_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/v1/mesaflow/products/sample.png`;

const publicConfig = {
  demoLoginEnabled: true,
  demoRoles: [
    {
      role: 'manager',
      label: 'Encargado',
      description: 'Gestiona el menú del restaurante.',
      icon: 'supervisor_account',
    },
  ],
};

const authResponse = {
  accessToken: 'e2e-access-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  roles: ['manager'],
  permissions: ['menu'],
  user: {
    id: 'user-e2e-manager',
    email: 'hidden@example.test',
    firstName: 'Test',
    lastName: 'Manager',
    enabled: true,
    accountType: 'demo',
    roles: ['role-manager'],
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-20T00:00:00.000Z',
  },
};

const restaurant = {
  id: RESTAURANT_ID,
  name: 'MesaFlow Demo',
  displayName: 'MesaFlow Demo',
  timezone: 'Europe/Madrid',
  currency: 'EUR',
  isActive: true,
};

const sizeModifierGroup = {
  id: 'mg-size',
  name: 'Tamaño',
  selectionType: 'single',
  minSelections: 1,
  maxSelections: 1,
  isRequired: true,
  options: [
    { id: 'opt-regular', name: 'Regular', priceDeltaCents: 0 },
    { id: 'opt-large', name: 'Grande', priceDeltaCents: 150 },
  ],
};

const existingMenuItem = {
  id: 'item-1',
  restaurantProductId: 'prod-1',
  name: 'Ensalada César',
  description: 'Con pollo y parmesano',
  imageUrl: null,
  productType: 'simple',
  priceCents: 990,
  currency: 'EUR',
  isAvailable: true,
  defaultCourse: 'starter',
  preparationRoute: 'kitchen',
  modifierGroups: [sizeModifierGroup],
  comboDefinition: null,
  platterComponents: [],
};

const menuDto = {
  id: 'menu-1',
  restaurantId: RESTAURANT_ID,
  name: 'Carta principal',
  isActive: true,
  sections: [{ id: 'sec-1', name: 'Platos', sortOrder: 10, isVisible: true, items: [existingMenuItem] }],
};

async function generatePngBuffer(page: Page, width: number, height: number): Promise<Buffer> {
  const base64 = await page.evaluate(
    ([w, h]) =>
      new Promise<string>((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('no 2d context'));
          return;
        }
        context.fillStyle = '#3aa6a6';
        context.fillRect(0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('toBlob failed'));
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]!);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        }, 'image/png');
      }),
    [width, height],
  );

  return Buffer.from(base64, 'base64');
}

async function mockAuthAndMenu(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/public-config', (route) => route.fulfill({ json: publicConfig }));
  await page.route('**/api/v1/auth/demo-login', (route) => route.fulfill({ json: authResponse }));
  await page.route('**/api/v1/restaurants', (route) => route.fulfill({ json: [restaurant] }));
  await page.route(`**/api/v1/restaurants/${RESTAURANT_ID}/menu`, (route) => route.fulfill({ json: menuDto }));
}

async function loginAsManager(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: /Encargado|Manager/ }).click();
  await expect(page).toHaveURL(/\/restaurant-pos\/menu$/);
}

test('uploads a product image and assigns a modifier group when creating a product', async ({ page }) => {
  await mockAuthAndMenu(page);

  let createdProductBody: Record<string, unknown> | null = null;
  await page.route(`**/api/v1/restaurants/${RESTAURANT_ID}/products`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fulfill({ json: [] });
      return;
    }

    createdProductBody = route.request().postDataJSON();
    await route.fulfill({
      json: {
        id: 'prod-new',
        productId: 'prod-new',
        organizationId: 'org-1',
        name: createdProductBody!['name'],
        displayName: null,
        imageUrl: createdProductBody!['imageUrl'] ?? null,
        description: createdProductBody!['description'] ?? null,
        displayDescription: null,
        modifierGroupIds: createdProductBody!['modifierGroupIds'] ?? [],
        productType: 'simple',
        course: createdProductBody!['course'],
        preparationRoute: createdProductBody!['preparationRoute'],
        preparationRouteOverride: null,
        priceCents: createdProductBody!['priceCents'],
        currency: 'EUR',
        isAvailable: true,
        isVisible: true,
      },
    });
  });

  await page.route(`**/api/v1/restaurants/${RESTAURANT_ID}/products/image-upload-signature`, (route) =>
    route.fulfill({
      json: { cloudName: CLOUD_NAME, apiKey: 'key123', timestamp: 1700000000, signature: 'sig123', folder: 'mesaflow/products' },
    }),
  );

  await page.route(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, (route) =>
    route.fulfill({ json: { secure_url: UPLOADED_IMAGE_URL } }),
  );

  await loginAsManager(page);

  await page.getByRole('button', { name: /Nuevo producto|New product/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByRole('textbox', { name: /^Nombre$|^Name$/ }).fill('Hamburguesa Especial');

  const imageBuffer = await generatePngBuffer(page, 500, 340);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'burger.png',
    mimeType: 'image/png',
    buffer: imageBuffer,
  });

  const productImage = page.getByRole('img', { name: 'Hamburguesa Especial' });
  await expect(productImage).toBeVisible();
  await expect(productImage).toHaveAttribute('src', UPLOADED_IMAGE_URL);

  await page.getByRole('checkbox', { name: /Tamaño/ }).check();

  await page.getByRole('button', { name: /Crear producto|Create product/ }).click();

  await expect(page.getByText(/Artículo creado correctamente|Item created successfully/)).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  expect(createdProductBody).not.toBeNull();
  expect(createdProductBody!['name']).toBe('Hamburguesa Especial');
  expect(createdProductBody!['imageUrl']).toBe(UPLOADED_IMAGE_URL);
  expect(createdProductBody!['modifierGroupIds']).toContain('mg-size');
});

test('shows an error and allows retrying when the image upload fails', async ({ page }) => {
  await mockAuthAndMenu(page);
  await page.route(`**/api/v1/restaurants/${RESTAURANT_ID}/products`, (route) =>
    route.fulfill({ json: route.request().method() === 'POST' ? {} : [] }),
  );
  await page.route(`**/api/v1/restaurants/${RESTAURANT_ID}/products/image-upload-signature`, (route) =>
    route.fulfill({
      json: { cloudName: CLOUD_NAME, apiKey: 'key123', timestamp: 1700000000, signature: 'sig123', folder: 'mesaflow/products' },
    }),
  );

  let uploadAttempts = 0;
  await page.route(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, (route) => {
    uploadAttempts += 1;
    // The upload service retries once automatically (retry({ count: 1 })), so the
    // first two attempts must fail before the UI surfaces the error/retry state.
    if (uploadAttempts <= 2) {
      return route.fulfill({ status: 500, json: { error: { message: 'upload failed' } } });
    }
    return route.fulfill({ json: { secure_url: UPLOADED_IMAGE_URL } });
  });

  await loginAsManager(page);

  await page.getByRole('button', { name: /Nuevo producto|New product/ }).click();
  await page.getByRole('textbox', { name: /^Nombre$|^Name$/ }).fill('Pizza Margarita');

  const imageBuffer = await generatePngBuffer(page, 500, 340);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'pizza.png',
    mimeType: 'image/png',
    buffer: imageBuffer,
  });

  await expect(
    page.getByText(/No se pudo subir la imagen\. Inténtalo de nuevo\.|The image could not be uploaded\. Please try again\./),
  ).toBeVisible();

  await page.getByRole('button', { name: /Reintentar subida|Retry upload/ }).click();

  const productImage = page.getByRole('img', { name: 'Pizza Margarita' });
  await expect(productImage).toBeVisible();
  await expect(productImage).toHaveAttribute('src', UPLOADED_IMAGE_URL);
  expect(uploadAttempts).toBe(3);
});
