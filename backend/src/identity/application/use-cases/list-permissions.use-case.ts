import { Inject, Injectable } from '@nestjs/common';

import { ok, type Result } from '../../../shared/result/result';
import { PERMISSION_REPOSITORY, type PermissionRepository } from '../ports/permission-repository.port';
import type { Permission } from '../../domain/permission.entity';

@Injectable()
export class ListPermissionsUseCase {
  constructor(@Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository) {}

  async execute(): Promise<Result<Permission[], never>> {
    return ok(await this.permissions.findAll());
  }
}
