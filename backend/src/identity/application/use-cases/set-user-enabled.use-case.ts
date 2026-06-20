import { Inject, Injectable } from '@nestjs/common';

import { applicationError, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { User } from '../../domain/user.entity';
import { AUTH_SESSION_REPOSITORY, type AuthSessionRepository } from '../ports/auth-session-repository.port';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.port';

@Injectable()
export class SetUserEnabledUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUTH_SESSION_REPOSITORY) private readonly sessions: AuthSessionRepository,
  ) {}

  async execute(userId: string, enabled: boolean): Promise<Result<User, ApplicationError>> {
    const user = await this.users.findById(userId);
    if (!user) return err(applicationError('user_not_found', 'User was not found.', { userId }));
    user.setEnabled(enabled);
    await this.users.save(user);
    if (!enabled) await this.sessions.disableAllForUser(userId);
    return ok(user);
  }
}
