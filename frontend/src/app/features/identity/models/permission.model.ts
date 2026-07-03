export type PermissionName = 'service' | 'menu' | 'kitchen' | 'layout' | 'reservations' | 'dashboard';

export interface Permission {
  id: string;
  name: PermissionName;
  description: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
