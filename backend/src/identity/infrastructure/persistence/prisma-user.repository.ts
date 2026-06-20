import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { UserRepository } from '../../application/ports/user-repository.port';
import { User } from '../../domain/user.entity';

type UserRecord = Awaited<ReturnType<PrismaService['user']['findUnique']>> & {
  roles?: Array<{ roleId: string }>;
};

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: User): Promise<void> {
    const value = user.toSnapshot();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: value.id },
        update: {
          email: value.email,
          firstName: value.firstName,
          lastName: value.lastName,
          passwordHash: value.passwordHash,
          enabled: value.enabled,
        },
        create: {
          id: value.id,
          email: value.email,
          firstName: value.firstName,
          lastName: value.lastName,
          passwordHash: value.passwordHash,
          enabled: value.enabled,
          createdAt: value.createdAt,
          updatedAt: value.updatedAt,
        },
      });
      await tx.userRole.deleteMany({ where: { userId: value.id } });
      if (value.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: value.roleIds.map((roleId) => ({ userId: value.id, roleId })),
        });
      }
      if (!value.enabled) {
        await tx.authSession.updateMany({
          where: { userId: value.id, enabled: true },
          data: { enabled: false, revokedAt: new Date() },
        });
      }
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.toDomain(await this.prisma.user.findUnique({ where: { id }, include: { roles: true } }));
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.toDomain(
      await this.prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        include: { roles: true },
      }),
    );
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      include: { roles: true },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((user) => this.toDomain(user)!);
  }

  private toDomain(record: UserRecord | null): User | null {
    if (!record) return null;
    return User.rehydrate({
      id: record.id,
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName,
      passwordHash: record.passwordHash,
      enabled: record.enabled,
      roleIds: record.roles?.map((role) => role.roleId) ?? [],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
