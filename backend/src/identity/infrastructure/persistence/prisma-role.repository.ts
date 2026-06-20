import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { RoleRepository } from '../../application/ports/role-repository.port';
import { normalizeRoleName, Role } from '../../domain/role.entity';

type RoleRecord = Awaited<ReturnType<PrismaService['role']['findUnique']>> & {
  permissions?: Array<{ permissionId: string }>;
};

@Injectable()
export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(role: Role): Promise<void> {
    const value = role.toSnapshot();
    await this.prisma.$transaction(async (tx) => {
      await tx.role.upsert({
        where: { id: value.id },
        update: {
          name: value.name,
          description: value.description,
          enabled: value.enabled,
        },
        create: {
          id: value.id,
          name: value.name,
          description: value.description,
          enabled: value.enabled,
          createdAt: value.createdAt,
          updatedAt: value.updatedAt,
        },
      });
      await tx.rolePermission.deleteMany({ where: { roleId: value.id } });
      if (value.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: value.permissionIds.map((permissionId) => ({ roleId: value.id, permissionId })),
        });
      }
    });
  }

  async findById(id: string): Promise<Role | null> {
    return this.toDomain(await this.prisma.role.findUnique({ where: { id }, include: { permissions: true } }));
  }

  async findByName(name: string): Promise<Role | null> {
    return this.toDomain(
      await this.prisma.role.findUnique({
        where: { name: normalizeRoleName(name) },
        include: { permissions: true },
      }),
    );
  }

  async findAll(): Promise<Role[]> {
    const roles = await this.prisma.role.findMany({ include: { permissions: true }, orderBy: { createdAt: 'asc' } });
    return roles.map((role) => this.toDomain(role)!);
  }

  async findManyByIds(ids: readonly string[]): Promise<Role[]> {
    const roles = await this.prisma.role.findMany({
      where: { id: { in: [...new Set(ids)] } },
      include: { permissions: true },
    });
    return roles.map((role) => this.toDomain(role)!);
  }

  private toDomain(record: RoleRecord | null): Role | null {
    if (!record) return null;
    return Role.rehydrate({
      id: record.id,
      name: record.name,
      description: record.description,
      enabled: record.enabled,
      permissionIds: record.permissions?.map((permission) => permission.permissionId) ?? [],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
