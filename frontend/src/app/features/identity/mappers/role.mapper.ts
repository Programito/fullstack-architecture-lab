import type { CreateRoleInput, Role } from '../models/role.model';
import type { CreateRoleRequest, RoleResponseDto } from '../api/identity-api.models';

export class RoleMapper {
  static fromDto(dto: RoleResponseDto): Role {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
    };
  }

  static toCreateRequest(input: CreateRoleInput): CreateRoleRequest {
    const request: CreateRoleRequest = {
      name: input.name,
    };

    if (input.description !== null && input.description !== undefined) {
      request.description = input.description;
    }

    return request;
  }
}
