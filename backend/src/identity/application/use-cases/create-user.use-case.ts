import { Inject, Injectable } from '@nestjs/common';

import { EVENT_BUS, type EventBus } from '../../../shared/events/event-bus.port';
import { applicationError, type ApplicationError } from '../../../shared/errors/application-error';
import { err, isErr, ok, type Result } from '../../../shared/result/result';
import { User } from '../../domain/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.port';
import { ROLE_REPOSITORY, type RoleRepository } from '../ports/role-repository.port';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.port';

export type CreateUserCommand = {
  email: string;
  name: string;
  password: string;
  roleIds?: string[];
};

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateUserCommand): Promise<Result<User, ApplicationError>> {
    const email = Email.create(command.email);
    if (isErr(email)) {
      return email;
    }

    const name = command.name.trim();
    if (name.length === 0) {
      return err(applicationError('invalid_user_name', 'Name is required.'));
    }

    if (command.password.length < 8) {
      return err(applicationError('invalid_password', 'Password must contain at least 8 characters.'));
    }

    const existingUser = await this.users.findByEmail(email.value.value);
    if (existingUser) {
      return err(applicationError('email_already_taken', 'Email is already taken.', { email: email.value.value }));
    }

    const roleIds = command.roleIds ?? [];
    if (roleIds.length > 0) {
      const roles = await this.roles.findManyByIds(roleIds);
      if (roles.length !== new Set(roleIds).size) {
        return err(applicationError('role_not_found', 'One or more roles were not found.', { roleIds }));
      }
    }

    const passwordHash = await this.passwordHasher.hash(command.password);
    const user = User.create({
      email: email.value.value,
      name,
      passwordHash,
      roleIds,
    });

    await this.users.save(user);
    await this.eventBus.publishMany(user.pullDomainEvents());

    return ok(user);
  }
}
