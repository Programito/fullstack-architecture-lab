export const PERMISSION_CATALOG = [
  {
    name: 'service',
    description: 'Acceso al módulo de servicio.',
  },
  {
    name: 'menu',
    description: 'Acceso al módulo de menú.',
  },
  {
    name: 'kitchen',
    description: 'Acceso al módulo de cocina.',
  },
  {
    name: 'layout',
    description: 'Acceso al módulo de plano.',
  },
] as const;

export type PermissionName = (typeof PERMISSION_CATALOG)[number]['name'];
