import { Inject, Injectable } from '@nestjs/common';

import type { ApplicationError } from '../../../shared/errors/application-error';
import { ok, type Result } from '../../../shared/result/result';
import type { Role } from '../../domain/role.entity';
import { ROLE_REPOSITORY, type RoleRepository } from '../ports/role-repository.port';

@Injectable()
export class ListRolesUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository) {}

  async execute(): Promise<Result<Role[], ApplicationError>> {
    return ok(await this.roles.findAll());
  }
}
