import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { applicationError, type ApplicationError } from '../../../shared/errors/application-error';
import { err, ok, type Result } from '../../../shared/result/result';
import type { AccountType } from '../../domain/account-type';
import type { User } from '../../domain/user.entity';
import { AUTH_SESSION_REPOSITORY, type AuthSessionRepository } from '../ports/auth-session-repository.port';
import { USER_REPOSITORY, type UserRepository } from '../ports/user-repository.port';

@Injectable()
export class SetUserAccountTypeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUTH_SESSION_REPOSITORY) private readonly sessions: AuthSessionRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(userId: string, accountType: AccountType): Promise<Result<User, ApplicationError>> {
    const user = await this.users.findById(userId);
    if (!user) return err(applicationError('user_not_found', 'User was not found.', { userId }));

    user.setAccountType(accountType);
    await this.users.save(user);

    const demoEnabled = this.config.get<string>('DEMO_LOGIN_ENABLED') === 'true';
    if (accountType === 'system' || accountType === 'test' || (accountType === 'demo' && !demoEnabled)) {
      await this.sessions.disableAllForUser(userId);
    }

    return ok(user);
  }
}
