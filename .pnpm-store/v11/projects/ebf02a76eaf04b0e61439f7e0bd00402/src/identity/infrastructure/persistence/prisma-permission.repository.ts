import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { PermissionRepository } from '../../application/ports/permission-repository.port';
import { normalizePermissionName, Permission } from '../../domain/permission.entity';

@Injectable()
export class PrismaPermissionRepository implements PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(permission: Permission): Promise<void> {
    const value = permission.toSnapshot();
    await this.prisma.permission.upsert({
      where: { id: value.id },
      update: {
        name: value.name,
        description: value.description,
        enabled: value.enabled,
      },
      create: value,
    });
  }

  async findById(id: string): Promise<Permission | null> {
    return this.toDomain(await this.prisma.permission.findUnique({ where: { id } }));
  }

  async findByName(name: string): Promise<Permission | null> {
    return this.toDomain(
      await this.prisma.permission.findUnique({
        where: { name: normalizePermissionName(name) },
      }),
    );
  }

  async findAll(): Promise<Permission[]> {
    const permissions = await this.prisma.permission.findMany({ orderBy: { createdAt: 'asc' } });
    return permissions.map((permission) => Permission.rehydrate(permission));
  }

  async findManyByIds(ids: readonly string[]): Promise<Permission[]> {
    const permissions = await this.prisma.permission.findMany({ where: { id: { in: [...new Set(ids)] } } });
    return permissions.map((permission) => Permission.rehydrate(permission));
  }

  private toDomain(record: Awaited<ReturnType<PrismaService['permission']['findUnique']>>): Permission | null {
    return record ? Permission.rehydrate(record) : null;
  }
}
