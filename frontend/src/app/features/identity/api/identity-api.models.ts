import type { PermissionName } from '../models/permission.model';

export interface RoleResponseDto {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  permissions: PermissionName[];
  createdAt: string;
  updatedAt: string;
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

export interface AssignRolePermissionsRequest {
  permissionIds: string[];
}
