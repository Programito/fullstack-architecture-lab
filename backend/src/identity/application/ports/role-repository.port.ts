import type { Role } from '../../domain/role.entity';

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

export interface RoleRepository {
  save(role: Role): Promise<void>;
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  findManyByIds(ids: readonly string[]): Promise<Role[]>;
}
