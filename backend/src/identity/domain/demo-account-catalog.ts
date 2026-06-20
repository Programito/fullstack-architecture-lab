import type { RoleName } from './role-catalog';

export const DEMO_ACCOUNT_PASSWORD = 'Demo1234!';

export const DEMO_ACCOUNT_CATALOG = [
  {
    role: 'admin',
    email: 'admin@mesaflow.demo',
    firstName: 'Alex',
    lastName: 'Administrador',
    label: 'Admin',
    description: 'Control completo del restaurante.',
    icon: 'admin_panel_settings',
  },
  {
    role: 'manager',
    email: 'manager@mesaflow.demo',
    firstName: 'Marta',
    lastName: 'Encargada',
    label: 'Encargado',
    description: 'Gestiona turnos, descuentos, menú y caja.',
    icon: 'storefront',
  },
  {
    role: 'waiter',
    email: 'waiter@mesaflow.demo',
    firstName: 'Carlos',
    lastName: 'Camarero',
    label: 'Camarero',
    description: 'Gestiona mesas, pedidos y cobros.',
    icon: 'room_service',
  },
  {
    role: 'kitchen',
    email: 'kitchen@mesaflow.demo',
    firstName: 'Lucía',
    lastName: 'Cocina',
    label: 'Cocina',
    description: 'Mueve pedidos entre En cocina, Preparado y Servido.',
    icon: 'skillet',
  },
  {
    role: 'developer',
    email: 'developer@mesaflow.demo',
    firstName: 'Dani',
    lastName: 'Developer',
    label: 'Developer',
    description: 'Accede a documentación, Storybook y arquitectura.',
    icon: 'code',
  },
] as const satisfies ReadonlyArray<{
  role: RoleName;
  email: string;
  firstName: string;
  lastName: string;
  label: string;
  description: string;
  icon: string;
}>;
