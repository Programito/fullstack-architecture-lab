import type { RoleName } from './role-catalog';

export const DEMO_ACCOUNT_PASSWORD = 'Demo1234!';

/**
 * `channel` distingue las cuentas demo pensadas para el selector del
 * dashboard interno ('staff') de las pensadas para clientes finales
 * ('client', p.ej. la app móvil). `AuthController.publicConfig` solo
 * expone las de canal 'staff' al selector web; `AuthService.demoLogin`
 * sigue validando contra el catálogo completo, así que cualquier canal
 * puede seguir usando `POST /auth/demo-login`.
 */
export const DEMO_ACCOUNT_CATALOG = [
  {
    role: 'admin',
    email: 'admin@mesaflow.demo',
    firstName: 'Alex',
    lastName: 'Administrador',
    label: 'Admin',
    description: 'Control completo del restaurante.',
    icon: 'admin_panel_settings',
    channel: 'staff',
  },
  {
    role: 'manager',
    email: 'manager@mesaflow.demo',
    firstName: 'Marta',
    lastName: 'Encargada',
    label: 'Encargado',
    description: 'Gestiona turnos, descuentos, menú y caja.',
    icon: 'storefront',
    channel: 'staff',
  },
  {
    role: 'waiter',
    email: 'waiter@mesaflow.demo',
    firstName: 'Carlos',
    lastName: 'Camarero',
    label: 'Camarero',
    description: 'Gestiona mesas, pedidos y cobros.',
    icon: 'room_service',
    channel: 'staff',
  },
  {
    role: 'kitchen',
    email: 'kitchen@mesaflow.demo',
    firstName: 'Lucía',
    lastName: 'Cocina',
    label: 'Cocina',
    description: 'Mueve pedidos entre En cocina, Preparado y Servido.',
    icon: 'skillet',
    channel: 'staff',
  },
  {
    role: 'customer',
    email: 'customer@mesaflow.demo',
    firstName: 'Cliente',
    lastName: 'Demo',
    label: 'Cliente',
    description: 'Pide y paga desde su mesa. Sin acceso a plano, reservas ni cocina.',
    icon: 'restaurant',
    // No sale en el selector de /auth/public-config del dashboard interno:
    // es la cuenta que usa la app móvil de cliente (ver mobile/AuthRepository).
    channel: 'client',
  },
  {
    role: 'developer',
    email: 'developer@mesaflow.demo',
    firstName: 'Dani',
    lastName: 'Developer',
    label: 'Developer',
    description: 'Accede a documentación, Storybook y arquitectura.',
    icon: 'code',
    channel: 'staff',
  },
] as const satisfies ReadonlyArray<{
  role: RoleName;
  email: string;
  firstName: string;
  lastName: string;
  label: string;
  description: string;
  icon: string;
  channel: 'staff' | 'client';
}>;
