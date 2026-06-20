import { expect, test } from '@playwright/test';

const publicConfig = {
  demoLoginEnabled: true,
  demoRoles: [
    {
      role: 'waiter',
      label: 'Camarero',
      description: 'Gestiona mesas, pedidos y cobros.',
      icon: 'room_service',
    },
  ],
};

const authResponse = {
  accessToken: 'e2e-access-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  roles: ['waiter'],
  permissions: ['service', 'layout'],
  user: {
    id: 'user-e2e',
    email: 'hidden@example.test',
    firstName: 'Test',
    lastName: 'User',
    enabled: true,
    accountType: 'demo',
    roles: ['role-waiter'],
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-20T00:00:00.000Z',
  },
};

test('logs into the quick demo as a waiter', async ({ page }) => {
  await page.route('**/api/v1/auth/public-config', (route) => route.fulfill({ json: publicConfig }));
  await page.route('**/api/v1/auth/demo-login', (route) => route.fulfill({ json: authResponse }));

  await page.goto('/login');

  await page.getByRole('button', { name: /Camarero|Waiter/ }).click();

  await expect(page).toHaveURL(/\/restaurant-pos\/service$/);
  await expect(page.getByRole('heading', { name: /Servicio de sala|Dining room service/ })).toBeVisible();
});

test('keeps the regular email and password login available', async ({ page }) => {
  await page.route('**/api/v1/auth/public-config', (route) => route.fulfill({
    json: { demoLoginEnabled: false, demoRoles: [] },
  }));
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({
    json: { ...authResponse, user: { ...authResponse.user, accountType: 'regular' } },
  }));

  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('regular@example.test');
  await page.locator('input[name="password"]').fill('supersecret');
  await page.getByRole('button', { name: /Entrar|Sign in/ }).click();

  await expect(page).toHaveURL(/\/restaurant-pos\/service$/);
});
