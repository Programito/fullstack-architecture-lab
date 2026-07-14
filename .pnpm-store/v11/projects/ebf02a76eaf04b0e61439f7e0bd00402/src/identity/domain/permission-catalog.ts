export const PERMISSION_CATALOG = [
  {
    name: 'service',
    description: 'Acceso al modulo de servicio.',
  },
  {
    name: 'time_tracking',
    description: 'Acceso al modulo de control horario.',
  },
  {
    name: 'menu',
    description: 'Acceso al modulo de menu.',
  },
  {
    name: 'kitchen',
    description: 'Acceso al modulo de cocina.',
  },
  {
    name: 'layout',
    description: 'Acceso al modulo de plano.',
  },
  {
    name: 'reservations',
    description: 'Acceso al modulo de reservas.',
  },
  {
    name: 'dashboard',
    description: 'Acceso al panel de analiticas.',
  },
] as const;

export type PermissionName = (typeof PERMISSION_CATALOG)[number]['name'];
