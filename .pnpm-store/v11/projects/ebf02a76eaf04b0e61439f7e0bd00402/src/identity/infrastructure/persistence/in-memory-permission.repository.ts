import { Injectable } from '@nestjs/common';

import type { PermissionRepository } from '../../application/ports/permission-repository.port';
import { normalizePermissionName, Permission } from '../../domain/permission.entity';

@Injectable()
export class InMemoryPermissionRepository implements PermissionRepository {
  private readonly permissions = new Map<string, Permission>();

  async save(permission: Permission): Promise<void> {
    this.permissions.set(permission.id, Permission.rehydrate(permission.toSnapshot()));
  }

  async findById(id: string): Promise<Permission | null> {
    const permission = this.permissions.get(id);
    return permission ? Permission.rehydrate(permission.toSnapshot()) : null;
  }

  async findByName(name: string): Promise<Permission | null> {
    const normalizedName = normalizePermissionName(name);
    const permission = [...this.permissions.values()].find((candidate) => candidate.name === normalizedName);
    return permission ? Permission.rehydrate(permission.toSnapshot()) : null;
  }

  async findAll(): Promise<Permission[]> {
    return [...this.permissions.values()]
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((permission) => Permission.rehydrate(permission.toSnapshot()));
  }

  async findManyByIds(ids: readonly string[]): Promise<Permission[]> {
    const uniqueIds = [...new Set(ids)];
    return uniqueIds.flatMap((id) => {
      const permission = this.permissions.get(id);
      return permission ? [Permission.rehydrate(permission.toSnapshot())] : [];
    });
  }

  clear(): void {
    this.permissions.clear();
  }
}
