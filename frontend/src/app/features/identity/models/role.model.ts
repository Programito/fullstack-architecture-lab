import type { PermissionName } from './permission.model';

export interface Role {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  permissions: PermissionName[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoleInput {
  name: string;
  description?: string | null;
}
