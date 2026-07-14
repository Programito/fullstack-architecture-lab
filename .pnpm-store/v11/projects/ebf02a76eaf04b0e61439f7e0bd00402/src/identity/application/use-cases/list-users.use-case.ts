import { Inject, Injectable } from '@nestjs/common';

import type { ApplicationError } from '../../../shared/errors/application-error';
import { ok, type Result } from '../../../shared/result/result';
import type { User } from '../../domain/user.entity';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.port';

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(): Promise<Result<User[], ApplicationError>> {
    return ok(await this.users.findAll());
  }
}
