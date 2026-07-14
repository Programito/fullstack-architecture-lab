import { Inject, Injectable } from '@nestjs/common';

import { applicationError, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import { PERMISSION_REPOSITORY, type PermissionRepository } from '../ports/permission-repository.port';
import type { Permission } from '../../domain/permission.entity';

@Injectable()
export class SetPermissionEnabledUseCase {
  constructor(@Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository) {}

  async execute(permissionId: string, enabled: boolean): Promise<Result<Permission, ApplicationError>> {
    const permission = await this.permissions.findById(permissionId);
    if (!permission) {
      return err(applicationError('permission_not_found', 'Permission was not found.', { permissionId }));
    }

    permission.setEnabled(enabled);
    await this.permissions.save(permission);

    return ok(permission);
  }
}
