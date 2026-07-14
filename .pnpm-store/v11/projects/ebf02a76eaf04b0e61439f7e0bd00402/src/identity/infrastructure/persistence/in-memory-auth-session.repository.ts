import { Injectable } from '@nestjs/common';

import type { AuthSessionRepository } from '../../application/ports/auth-session-repository.port';
import { AuthSession } from '../../domain/auth-session.entity';

@Injectable()
export class InMemoryAuthSessionRepository implements AuthSessionRepository {
  private readonly sessions = new Map<string, AuthSession>();

  async save(session: AuthSession): Promise<void> {
    this.sessions.set(session.id, AuthSession.rehydrate(session.toSnapshot()));
  }

  async findById(id: string): Promise<AuthSession | null> {
    const session = this.sessions.get(id);
    return session ? AuthSession.rehydrate(session.toSnapshot()) : null;
  }

  async findByUserId(userId: string): Promise<AuthSession[]> {
    return [...this.sessions.values()]
      .filter((session) => session.userId === userId)
      .map((session) => AuthSession.rehydrate(session.toSnapshot()));
  }

  async disableAllForUser(userId: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        session.setEnabled(false);
      }
    }
  }

  clear(): void {
    this.sessions.clear();
  }
}
