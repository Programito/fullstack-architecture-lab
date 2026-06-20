import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { fireEvent, render, screen, within } from '@testing-library/angular';
import type { Observable } from 'rxjs';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import type { AuthPublicConfigDto, AuthResponseDto, DemoRoleName } from '../../api/identity-api.models';
import { IdentityApiService } from '../../api/identity-api.service';
import { IdentitySessionStore } from '../../identity-session.store';
import { LoginPage } from './login-page';

@Component({
  standalone: true,
  template: '',
})
class DummyRouteComponent {}

describe('LoginPage', () => {
  const demoRoles: AuthPublicConfigDto['demoRoles'] = [
    { role: 'admin', label: 'Admin from API', description: 'API admin', icon: 'shield_person' },
    { role: 'manager', label: 'Manager from API', description: 'API manager', icon: 'supervisor_account' },
    { role: 'waiter', label: 'Waiter from API', description: 'API waiter', icon: 'room_service' },
    { role: 'kitchen', label: 'Kitchen from API', description: 'API kitchen', icon: 'skillet' },
    { role: 'developer', label: 'Developer from API', description: 'API developer', icon: 'code' },
  ];
  const authResponse: AuthResponseDto = {
    accessToken: 'token',
    tokenType: 'Bearer',
    expiresIn: 900,
    roles: ['developer'],
    permissions: [],
    user: {
      id: 'user-1',
      email: 'developer@mesaflow.demo',
      firstName: 'Dani',
      lastName: 'Developer',
      enabled: true,
      accountType: 'demo',
      roles: ['developer'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  const renderPage = async ({
    locale = 'es',
    config = { demoLoginEnabled: true, demoRoles },
    demoLogin = vi.fn<(role: DemoRoleName) => Observable<AuthResponseDto>>(),
    login = vi.fn<(email: string, password: string) => Observable<AuthResponseDto>>(),
  }: {
    locale?: 'es' | 'en' | 'ca';
    config?: AuthPublicConfigDto;
    demoLogin?: ReturnType<typeof vi.fn>;
    login?: ReturnType<typeof vi.fn>;
  } = {}) => {
    const i18n = provideI18nTesting(locale);
    const store = { setAuthResponse: vi.fn() };
    const api = {
      getAuthPublicConfig: vi.fn(() => of(config)),
      demoLogin,
      login,
    };

    const result = await render(LoginPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        provideRouter([
          { path: 'developer', component: DummyRouteComponent },
          { path: 'restaurant-pos/service', component: DummyRouteComponent },
          { path: 'restaurant-pos/layout', component: DummyRouteComponent },
        ]),
        { provide: IdentityApiService, useValue: api },
        { provide: IdentitySessionStore, useValue: store },
      ],
    });

    return { ...result, api, store };
  };

  it('renders the new product copy in Spanish and removes portfolio wording', async () => {
    await renderPage();

    expect(screen.getByText('Sala, cocina y cobros')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Explora MesaFlow' })).toBeTruthy();
    expect(screen.getByText('Restaurant Suite')).toBeTruthy();
    expect(screen.queryByText('Restaurant POS')).toBeNull();
    expect(screen.getByText('Gestiona mesas, pedidos, cocina y cobros desde una experiencia pensada para restaurantes.')).toBeTruthy();
    expect(screen.getByText('Plano de mesas, pedidos y cobros')).toBeTruthy();
    expect(screen.getByText('Cocina y preparación en tiempo real')).toBeTruthy();
    expect(screen.getByText('Carta, menús y platos combinados')).toBeTruthy();
    expect(screen.getByText('Elige un perfil para recorrer MesaFlow sin introducir credenciales.')).toBeTruthy();
    expect(screen.queryByText(/portfolio/i)).toBeNull();
  });

  it('shows the demo tab selected by default when quick demo is enabled', async () => {
    await renderPage();

    expect(screen.getByRole('tab', { name: 'Demo rápida' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Usuario y contraseña' })).toBeTruthy();
  });

  it('groups the restaurant profiles separately from the technical profile', async () => {
    await renderPage();

    const restaurantSection = screen.getByRole('region', { name: 'Perfiles de restaurante' });
    expect(within(restaurantSection).getByRole('button', { name: /Admin/ })).toBeTruthy();
    expect(within(restaurantSection).getByRole('button', { name: /Encargado/ })).toBeTruthy();
    expect(within(restaurantSection).getByRole('button', { name: /Camarero/ })).toBeTruthy();
    expect(within(restaurantSection).getByRole('button', { name: /Cocina/ })).toBeTruthy();

    const technicalSection = screen.getByRole('region', { name: 'Perfil técnico' });
    expect(within(technicalSection).getByRole('button', { name: /Developer/ })).toBeTruthy();
    expect(screen.queryByText('Entrar ahora')).toBeNull();
    expect(screen.queryByText('Recomendado')).toBeNull();
  });

  it('sends waiter and kitchen to demo-login and keeps only the selected role busy', async () => {
    const pendingRequest = new Subject<AuthResponseDto>();
    const demoLogin = vi.fn(() => pendingRequest);

    await renderPage({ demoLogin });

    const waiterButton = screen.getByRole('button', { name: /Camarero/ });
    const kitchenButton = screen.getByRole('button', { name: /Cocina/ });

    fireEvent.click(waiterButton);

    expect(demoLogin).toHaveBeenCalledWith('waiter');
    expect(waiterButton.getAttribute('aria-busy')).toBe('true');
    expect(kitchenButton.getAttribute('aria-busy')).toBe('false');

    fireEvent.click(kitchenButton);
    expect(demoLogin).toHaveBeenCalledTimes(1);

    pendingRequest.complete();

    const secondPendingRequest = new Subject<AuthResponseDto>();
    demoLogin.mockReturnValueOnce(secondPendingRequest);

    fireEvent.click(kitchenButton);
    expect(demoLogin).toHaveBeenLastCalledWith('kitchen');
  });

  it('sends developer to demo-login from the technical section', async () => {
    const demoLogin = vi.fn(() => of(authResponse));

    await renderPage({ demoLogin });

    fireEvent.click(screen.getByRole('button', { name: /Developer/ }));

    expect(demoLogin).toHaveBeenCalledWith('developer');
  });

  it('shows a friendly error when demo login fails', async () => {
    const demoLogin = vi.fn(() => throwError(() => new Error('demo failed')));

    await renderPage({ demoLogin });

    fireEvent.click(screen.getByRole('button', { name: /Developer/ }));

    expect((await screen.findByRole('alert')).textContent).toContain('No se ha podido abrir la demo ahora mismo. Inténtalo de nuevo en unos minutos.');
  });

  it('shows credential validation, allows toggling the password visibility and submits the login', async () => {
    const loginRequest = new Subject<AuthResponseDto>();
    const login = vi.fn(() => loginRequest);

    await renderPage({
      config: { demoLoginEnabled: false, demoRoles: [] },
      login,
    });

    const emailInput = screen.getByRole('textbox', { name: 'Email' });
    const passwordInput = screen.getByLabelText('Contraseña');
    const submitButton = screen.getByRole('button', { name: 'Entrar' });

    fireEvent.click(submitButton);

    expect(screen.getByText('Introduce tu email.')).toBeTruthy();
    expect(screen.getByText('Introduce tu contraseña.')).toBeTruthy();

    fireEvent.input(emailInput, { target: { value: 'correo-invalido' } });
    fireEvent.input(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    expect(screen.getByText('Introduce un email válido.')).toBeTruthy();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeTruthy();

    const toggleButton = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(passwordInput.getAttribute('type')).toBe('password');

    fireEvent.click(toggleButton);
    expect(passwordInput.getAttribute('type')).toBe('text');

    fireEvent.input(emailInput, { target: { value: 'manager@mesaflow.app' } });
    fireEvent.input(passwordInput, { target: { value: 'Demo1234!' } });
    fireEvent.click(submitButton);

    expect(login).toHaveBeenCalledWith('manager@mesaflow.app', 'Demo1234!');
    expect(submitButton.getAttribute('aria-busy')).toBe('true');
  });

  it('shows only the credential form when demo is disabled', async () => {
    await renderPage({
      config: { demoLoginEnabled: false, demoRoles: [] },
    });

    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByText('Demo rápida')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Usuario y contraseña' })).toBeTruthy();
  });

  it('renders the updated copy in English', async () => {
    await renderPage({ locale: 'en' });

    expect(screen.getByText('Dining room, kitchen, and payments')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Explore MesaFlow' })).toBeTruthy();
    expect(screen.getByText('Manage tables, orders, kitchen, and payments from an experience designed for restaurants.')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Quick demo' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Product sign-in' })).toBeTruthy();
    expect(screen.queryByText(/portfolio/i)).toBeNull();
  });

  it('updates the login copy when the language changes from the selector', async () => {
    await renderPage({ locale: 'es' });

    expect(screen.getByRole('heading', { name: 'Explora MesaFlow' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Demo/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Idioma:/ }));
    fireEvent.click(screen.getByRole('option', { name: 'EN English' }));

    expect(await screen.findByRole('heading', { name: 'Explore MesaFlow' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Quick demo' })).toBeTruthy();
  });
});
