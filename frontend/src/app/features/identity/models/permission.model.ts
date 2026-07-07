export type PermissionName =
  | 'service'
  | 'time_tracking'
  | 'menu'
  | 'kitchen'
  | 'layout'
  | 'reservations'
  | 'dashboard';

export interface Permission {
  id: string;
  name: PermissionName;
  description: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
