import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import { RoleMapper } from '../mappers/role.mapper';
import { UserMapper } from '../mappers/user.mapper';
import type { Permission } from '../models/permission.model';
import type { CreateRoleInput, Role } from '../models/role.model';
import type { CreateUserInput, User } from '../models/user.model';
import type {
  AuthMeResponseDto,
  PermissionResponseDto,
  RoleResponseDto,
  UserResponseDto,
} from './identity-api.models';

@Injectable({
  providedIn: 'root',
})
export class IdentityApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly usersUrl = `${this.apiBaseUrl}/users`;
  private readonly rolesUrl = `${this.apiBaseUrl}/roles`;
  private readonly permissionsUrl = `${this.apiBaseUrl}/permissions`;
  private readonly authUrl = `${this.apiBaseUrl}/auth`;

  listUsers(): Observable<User[]> {
    return this.http.get<UserResponseDto[]>(this.usersUrl).pipe(map((users) => users.map(UserMapper.fromDto)));
  }

  createUser(input: CreateUserInput): Observable<User> {
    return this.http.post<UserResponseDto>(this.usersUrl, UserMapper.toCreateRequest(input)).pipe(map(UserMapper.fromDto));
  }

  assignUserRoles(userId: string, roleIds: string[]): Observable<User> {
    return this.http
      .patch<UserResponseDto>(`${this.usersUrl}/${userId}/roles`, UserMapper.toAssignRolesRequest(roleIds))
      .pipe(map(UserMapper.fromDto));
  }

  listRoles(): Observable<Role[]> {
    return this.http.get<RoleResponseDto[]>(this.rolesUrl).pipe(map((roles) => roles.map(RoleMapper.fromDto)));
  }

  createRole(input: CreateRoleInput): Observable<Role> {
    return this.http.post<RoleResponseDto>(this.rolesUrl, RoleMapper.toCreateRequest(input)).pipe(map(RoleMapper.fromDto));
  }

  listPermissions(): Observable<Permission[]> {
    return this.http.get<PermissionResponseDto[]>(this.permissionsUrl).pipe(
      map((permissions) =>
        permissions.map((permission) => ({
          id: permission.id,
          name: permission.name,
          description: permission.description,
          enabled: permission.enabled,
          createdAt: new Date(permission.createdAt),
          updatedAt: new Date(permission.updatedAt),
        })),
      ),
    );
  }

  getCurrentIdentity(): Observable<AuthMeResponseDto> {
    return this.http.get<AuthMeResponseDto>(`${this.authUrl}/me`);
  }
}
