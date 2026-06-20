import { Inject, Injectable } from '@nestjs/common';

import { applicationError, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import { PERMISSION_REPOSITORY, type PermissionRepository } from '../ports/permission-repository.port';
import { ROLE_REPOSITORY, type RoleRepository } from '../ports/role-repository.port';
import type { Role } from '../../domain/role.entity';

export type AssignRolePermissionsCommand = {
  roleId: string;
  permissionIds: string[];
};

@Injectable()
export class AssignRolePermissionsUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository,
  ) {}

  async execute(command: AssignRolePermissionsCommand): Promise<Result<Role, ApplicationError>> {
    const role = await this.roles.findById(command.roleId);
    if (!role) {
      return err(applicationError('role_not_found', 'Role was not found.', { roleId: command.roleId }));
    }

    const uniquePermissionIds = [...new Set(command.permissionIds)];
    const permissions = await this.permissions.findManyByIds(uniquePermissionIds);
    if (permissions.length !== uniquePermissionIds.length) {
      return err(
        applicationError('permission_not_found', 'One or more permissions were not found.', {
          permissionIds: uniquePermissionIds,
        }),
      );
    }

    role.assignPermissions(uniquePermissionIds);
    await this.roles.save(role);

    return ok(role);
  }
}
