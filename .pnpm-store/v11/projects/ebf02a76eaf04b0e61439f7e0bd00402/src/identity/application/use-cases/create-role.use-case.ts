import { Inject, Injectable } from '@nestjs/common';

import { EVENT_BUS, type EventBus } from '../../../shared/events/event-bus.port';
import { applicationError, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import { normalizeRoleName, Role } from '../../domain/role.entity';
import { ROLE_REPOSITORY, type RoleRepository } from '../ports/role-repository.port';

export type CreateRoleCommand = {
  name: string;
  description?: string | null;
};

@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateRoleCommand): Promise<Result<Role, ApplicationError>> {
    const name = normalizeRoleName(command.name);
    if (name.length === 0) {
      return err(applicationError('invalid_role_name', 'Role name is required.'));
    }

    const existingRole = await this.roles.findByName(name);
    if (existingRole) {
      return err(applicationError('role_name_already_taken', 'Role name is already taken.', { name }));
    }

    const role = Role.create({ name, description: command.description });

    await this.roles.save(role);
    await this.eventBus.publishMany(role.pullDomainEvents());

    return ok(role);
  }
}
