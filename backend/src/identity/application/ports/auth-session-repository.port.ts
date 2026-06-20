import type { AuthSession } from '../../domain/auth-session.entity';

export const AUTH_SESSION_REPOSITORY = Symbol('AUTH_SESSION_REPOSITORY');

export interface AuthSessionRepository {
  save(session: AuthSession): Promise<void>;
  findById(id: string): Promise<AuthSession | null>;
  findByUserId(userId: string): Promise<AuthSession[]>;
  disableAllForUser(userId: string): Promise<void>;
}
