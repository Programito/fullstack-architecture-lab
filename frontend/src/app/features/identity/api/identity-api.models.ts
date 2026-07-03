import type { PermissionName } from '../models/permission.model';

export type AccountType = 'regular' | 'demo' | 'system' | 'test';
export type DemoRoleName = 'admin' | 'manager' | 'waiter' | 'kitchen' | 'developer';

export interface RoleResponseDto {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  permissions: PermissionName[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponseDto {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: UserResponseDto;
  roles: string[];
  permissions: PermissionName[];
  scopes: {
    organizations: string[];
    restaurants: string[];
  };
}

export interface AuthPublicConfigDto {
  demoLoginEnabled: boolean;
  demoRoles: Array<{
    role: DemoRoleName;
    label: string;
    description: string;
    icon: string;
  }>;
}

export interface ReadinessStatusDto {
  status: 'ready' | 'warming_up' | 'down';
  database: 'ready' | 'warming_up' | 'down';
  durationMs: number;
}

export interface DeveloperResourcesDto {
  storybookUrl: string;
  apiDocsUrl: string;
  architectureUrl: string;
}

export interface PermissionResponseDto {
  id: string;
  name: PermissionName;
  description: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  accountType: AccountType;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthMeResponseDto {
  userId: string;
  roles: string[];
  permissions: PermissionName[];
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleIds?: string[];
}

export interface AssignUserRolesRequest {
  roleIds: string[];
}

export interface OrganizationSummaryDto {
  id: string;
  name: string;
}

export interface SetUserScopeRequest {
  organizationId: string;
  restaurantId?: string;
}

export interface AssignRolePermissionsRequest {
  permissionIds: string[];
}
