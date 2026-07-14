import { Inject, Injectable } from '@nestjs/common';

import { applicationError, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { User } from '../../domain/user.entity';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.port';
import { USER_ROLE_ASSIGNMENT_REPOSITORY, type UserRoleAssignmentRepository } from '../ports/user-role-assignment-repository.port';

export type SetUserRestaurantScopeCommand = {
  userId: string;
  organizationId: string;
  restaurantId?: string;
};

@Injectable()
export class SetUserRestaurantScopeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(USER_ROLE_ASSIGNMENT_REPOSITORY) private readonly assignments: UserRoleAssignmentRepository,
  ) {}

  async execute(command: SetUserRestaurantScopeCommand): Promise<Result<User, ApplicationError>> {
    const user = await this.users.findById(command.userId);
    if (!user) {
      return err(applicationError('user_not_found', 'User was not found.', { userId: command.userId }));
    }

    await this.assignments.replaceScopeForUser(user.id, user.roleIds, {
      organizationId: command.organizationId,
      restaurantId: command.restaurantId ?? null,
    });

    return ok(user);
  }
}
