import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/api/api.config';
import { RoleMapper } from '../mappers/role.mapper';
import { UserMapper } from '../mappers/user.mapper';
import type { CreateRoleInput, Role } from '../models/role.model';
import type { CreateUserInput, User } from '../models/user.model';
import type { RoleResponseDto, UserResponseDto } from './identity-api.models';

@Injectable({
  providedIn: 'root',
})
export class IdentityApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly usersUrl = `${this.apiBaseUrl}/users`;
  private readonly rolesUrl = `${this.apiBaseUrl}/roles`;

  listUsers(): Observable<User[]> {
    return this.http
      .get<UserResponseDto[]>(this.usersUrl)
      .pipe(map((users) => users.map(UserMapper.fromDto)));
  }

  createUser(input: CreateUserInput): Observable<User> {
    return this.http
      .post<UserResponseDto>(this.usersUrl, UserMapper.toCreateRequest(input))
      .pipe(map(UserMapper.fromDto));
  }

  assignUserRoles(userId: string, roleIds: string[]): Observable<User> {
    return this.http
      .patch<UserResponseDto>(`${this.usersUrl}/${userId}/roles`, UserMapper.toAssignRolesRequest(roleIds))
      .pipe(map(UserMapper.fromDto));
  }

  listRoles(): Observable<Role[]> {
    return this.http
      .get<RoleResponseDto[]>(this.rolesUrl)
      .pipe(map((roles) => roles.map(RoleMapper.fromDto)));
  }

  createRole(input: CreateRoleInput): Observable<Role> {
    return this.http
      .post<RoleResponseDto>(this.rolesUrl, RoleMapper.toCreateRequest(input))
      .pipe(map(RoleMapper.fromDto));
  }
}
