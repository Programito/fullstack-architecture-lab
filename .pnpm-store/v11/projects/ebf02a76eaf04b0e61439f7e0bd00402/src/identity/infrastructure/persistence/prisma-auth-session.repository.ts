import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { AuthSessionRepository } from '../../application/ports/auth-session-repository.port';
import { AuthSession } from '../../domain/auth-session.entity';

@Injectable()
export class PrismaAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(session: AuthSession): Promise<void> {
    const value = session.toSnapshot();
    await this.prisma.authSession.upsert({
      where: { id: value.id },
      update: {
        refreshTokenHash: value.refreshTokenHash,
        enabled: value.enabled,
        expiresAt: value.expiresAt,
        absoluteExpiresAt: value.absoluteExpiresAt,
        revokedAt: value.revokedAt,
      },
      create: value,
    });
  }

  async findById(id: string): Promise<AuthSession | null> {
    const session = await this.prisma.authSession.findUnique({ where: { id } });
    return session ? AuthSession.rehydrate(session) : null;
  }

  async findByUserId(userId: string): Promise<AuthSession[]> {
    const sessions = await this.prisma.authSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return sessions.map((session) => AuthSession.rehydrate(session));
  }

  async disableAllForUser(userId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId, enabled: true },
      data: { enabled: false, revokedAt: new Date() },
    });
  }
}
