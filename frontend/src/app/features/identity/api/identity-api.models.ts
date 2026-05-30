export interface RoleResponseDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  roleIds?: string[];
}

export interface AssignUserRolesRequest {
  roleIds: string[];
}
