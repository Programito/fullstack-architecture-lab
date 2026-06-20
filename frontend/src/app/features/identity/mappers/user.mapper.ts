import type { AssignUserRolesRequest, CreateUserRequest, UserResponseDto } from '../api/identity-api.models';
import type { CreateUserInput, User } from '../models/user.model';

export class UserMapper {
  static fromDto(dto: UserResponseDto): User {
    return {
      id: dto.id,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      enabled: dto.enabled,
      accountType: dto.accountType,
      roleIds: [...dto.roles],
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
    };
  }

  static toCreateRequest(input: CreateUserInput): CreateUserRequest {
    const request: CreateUserRequest = {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      password: input.password,
    };

    if (input.roleIds !== undefined) {
      request.roleIds = [...input.roleIds];
    }

    return request;
  }

  static toAssignRolesRequest(roleIds: string[]): AssignUserRolesRequest {
    return {
      roleIds: [...roleIds],
    };
  }
}
