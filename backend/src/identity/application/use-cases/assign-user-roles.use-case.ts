import { Inject, Injectable } from '@nestjs/common';

import { EVENT_BUS, type EventBus } from '../../../shared/events/event-bus.port';
import { applicationError, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { User } from '../../domain/user.entity';
import { ROLE_REPOSITORY, type RoleRepository } from '../ports/role-repository.port';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.port';

export type AssignUserRolesCommand = {
  userId: string;
  roleIds: string[];
};

@Injectable()
export class AssignUserRolesUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(command: AssignUserRolesCommand): Promise<Result<User, ApplicationError>> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      return err(applicationError('user_not_found', `User "${command.userId}" was not found.`, { userId: command.userId }));
    }

    const uniqueRoleIds = [...new Set(command.roleIds)];
    const roles = await this.roles.findManyByIds(uniqueRoleIds);
    if (roles.length !== uniqueRoleIds.length) {
      return err(applicationError('role_not_found', 'One or more roles were not found.', { roleIds: uniqueRoleIds }));
    }

    user.assignRoles(uniqueRoleIds);

    await this.users.save(user);
    await this.eventBus.publishMany(user.pullDomainEvents());

    return ok(user);
  }
}
