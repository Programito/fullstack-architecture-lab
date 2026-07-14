export const ROLE_CATALOG = [
  {
    name: 'admin',
    description: 'Control completo del restaurante.',
    permissionNames: ['service', 'time_tracking', 'menu', 'kitchen', 'layout', 'reservations', 'dashboard'],
  },
  {
    name: 'manager',
    description: 'Gestion de turnos, descuentos y caja.',
    permissionNames: ['service', 'time_tracking', 'menu', 'kitchen', 'layout', 'reservations', 'dashboard'],
  },
  {
    name: 'waiter',
    description: 'Gestion de mesas y pedidos.',
    permissionNames: ['service', 'time_tracking', 'layout', 'reservations'],
  },
  {
    name: 'kitchen',
    description: 'Preparacion de pedidos.',
    permissionNames: ['kitchen', 'time_tracking'],
  },
  {
    name: 'customer',
    description: 'Cliente en mesa: pide y paga desde la app movil (sin acceso a plano ni reservas).',
    permissionNames: ['service'],
  },
  {
    name: 'developer',
    description: 'Documentacion, Storybook, arquitectura y demo tecnica.',
    permissionNames: [],
  },
] as const;

export type RoleName = (typeof ROLE_CATALOG)[number]['name'];
