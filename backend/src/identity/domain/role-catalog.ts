export const ROLE_CATALOG = [
  {
    name: 'admin',
    description: 'Control completo del restaurante.',
    permissionNames: ['service', 'menu', 'kitchen', 'layout', 'reservations', 'dashboard'],
  },
  {
    name: 'manager',
    description: 'Gestión de turnos, descuentos y caja.',
    permissionNames: ['service', 'menu', 'kitchen', 'layout', 'reservations', 'dashboard'],
  },
  {
    name: 'waiter',
    description: 'Gestión de mesas y pedidos.',
    permissionNames: ['service', 'layout', 'reservations'],
  },
  {
    name: 'kitchen',
    description: 'Preparación de pedidos.',
    permissionNames: ['kitchen'],
  },
  {
    name: 'developer',
    description: 'Documentación, Storybook, arquitectura y demo técnica.',
    permissionNames: [],
  },
] as const;

export type RoleName = (typeof ROLE_CATALOG)[number]['name'];
