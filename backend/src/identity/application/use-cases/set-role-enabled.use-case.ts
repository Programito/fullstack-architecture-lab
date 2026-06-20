import { Inject, Injectable } from '@nestjs/common';

import { applicationError, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { Role } from '../../domain/role.entity';
import { ROLE_REPOSITORY, type RoleRepository } from '../ports/role-repository.port';

@Injectable()
export class SetRoleEnabledUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository) {}

  async execute(roleId: string, enabled: boolean): Promise<Result<Role, ApplicationError>> {
    const role = await this.roles.findById(roleId);
    if (!role) return err(applicationError('role_not_found', 'Role was not found.', { roleId }));
    role.setEnabled(enabled);
    await this.roles.save(role);
    return ok(role);
  }
}
