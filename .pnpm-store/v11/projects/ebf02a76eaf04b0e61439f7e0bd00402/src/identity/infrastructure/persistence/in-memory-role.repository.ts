import { Injectable } from '@nestjs/common';

import type { RoleRepository } from '../../application/ports/role-repository.port';
import { normalizeRoleName, Role } from '../../domain/role.entity';

@Injectable()
export class InMemoryRoleRepository implements RoleRepository {
  private readonly roles = new Map<string, Role>();

  async save(role: Role): Promise<void> {
    this.roles.set(role.id, Role.rehydrate(role.toSnapshot()));
  }

  async findById(id: string): Promise<Role | null> {
    const role = this.roles.get(id);

    return role ? Role.rehydrate(role.toSnapshot()) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const normalizedName = normalizeRoleName(name);
    const role = [...this.roles.values()].find((candidate) => candidate.name === normalizedName);

    return role ? Role.rehydrate(role.toSnapshot()) : null;
  }

  async findAll(): Promise<Role[]> {
    return [...this.roles.values()]
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((role) => Role.rehydrate(role.toSnapshot()));
  }

  async findManyByIds(ids: readonly string[]): Promise<Role[]> {
    const uniqueIds = [...new Set(ids)];

    return uniqueIds.flatMap((id) => {
      const role = this.roles.get(id);
      return role ? [Role.rehydrate(role.toSnapshot())] : [];
    });
  }

  clear(): void {
    this.roles.clear();
  }
}
