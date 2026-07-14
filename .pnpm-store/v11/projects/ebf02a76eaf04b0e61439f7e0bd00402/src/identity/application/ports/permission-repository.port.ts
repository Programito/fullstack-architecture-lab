import type { Permission } from '../../domain/permission.entity';

export const PERMISSION_REPOSITORY = Symbol('PERMISSION_REPOSITORY');

export interface PermissionRepository {
  save(permission: Permission): Promise<void>;
  findById(id: string): Promise<Permission | null>;
  findByName(name: string): Promise<Permission | null>;
  findAll(): Promise<Permission[]>;
  findManyByIds(ids: readonly string[]): Promise<Permission[]>;
}
