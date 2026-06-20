import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FAKE_DATA_GENERATOR, type FakeDataGenerator } from '../../../shared/fake-data/fake-data-generator.port';
import { isErr } from '../../../shared/result/result';
import { PERMISSION_REPOSITORY, type PermissionRepository } from '../../application/ports/permission-repository.port';
import { AssignRolePermissionsUseCase } from '../../application/use-cases/assign-role-permissions.use-case';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { ListPermissionsUseCase } from '../../application/use-cases/list-permissions.use-case';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case';
import { PERMISSION_CATALOG } from '../../domain/permission-catalog';
import type { Permission } from '../../domain/permission.entity';
import { ROLE_CATALOG, type RoleName } from '../../domain/role-catalog';
import { Permission as PermissionEntity } from '../../domain/permission.entity';
import type { Role } from '../../domain/role.entity';

const ADMIN_USER = {
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  password: 'admin1234',
  roles: ['admin'],
} as const;

@Injectable()
export class InMemoryIdentitySeed implements OnApplicationBootstrap {
  constructor(
    private readonly config: ConfigService,
    @Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository,
    private readonly listPermissions: ListPermissionsUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly listRoles: ListRolesUseCase,
    private readonly assignRolePermissions: AssignRolePermissionsUseCase,
    private readonly createUser: CreateUserUseCase,
    @Inject(FAKE_DATA_GENERATOR) private readonly fakeData: FakeDataGenerator,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get<string>('IDENTITY_PERSISTENCE') !== 'memory') {
      return;
    }

    const permissionsByName = await this.seedPermissions();
    const rolesByName = await this.seedRoles(permissionsByName);

    if (this.config.get<string>('IDENTITY_MEMORY_SEED') === 'false') {
      return;
    }

    await this.seedUser(ADMIN_USER, rolesByName);

    for (let index = 0; index < this.getDemoUserCount(); index += 1) {
      await this.seedUser(this.createDemoUser(index), rolesByName);
    }
  }

  private async seedPermissions(): Promise<Map<string, Permission>> {
    for (const permission of PERMISSION_CATALOG) {
      if (!(await this.permissions.findByName(permission.name))) {
        await this.permissions.save(PermissionEntity.create(permission));
      }
    }

    const permissions = await this.listPermissions.execute();
    if (isErr(permissions)) {
      throw new Error('Could not list seeded permissions.');
    }

    return new Map(permissions.value.map((permission) => [permission.name, permission]));
  }

  private async seedRoles(permissionsByName: Map<string, Permission>): Promise<Map<string, Role>> {
    for (const role of ROLE_CATALOG) {
      const result = await this.createRole.execute(role);

      if (isErr(result) && result.error.code !== 'role_name_already_taken') {
        throw new Error(`Could not seed role "${role.name}": ${result.error.message}`);
      }
    }

    const roles = await this.listRoles.execute();
    if (isErr(roles)) {
      throw new Error(`Could not list seeded roles: ${roles.error.message}`);
    }

    for (const catalogRole of ROLE_CATALOG) {
      const role = roles.value.find((candidate) => candidate.name === catalogRole.name);
      if (!role) continue;
      const permissionIds = catalogRole.permissionNames
        .map((permissionName) => permissionsByName.get(permissionName)?.id)
        .filter((permissionId): permissionId is string => Boolean(permissionId));
      const assignResult = await this.assignRolePermissions.execute({ roleId: role.id, permissionIds });
      if (isErr(assignResult)) {
        throw new Error(`Could not assign permissions to role "${catalogRole.name}": ${assignResult.error.message}`);
      }
    }

    const updatedRoles = await this.listRoles.execute();
    if (isErr(updatedRoles)) {
      throw new Error(`Could not list updated roles: ${updatedRoles.error.message}`);
    }

    return new Map(updatedRoles.value.map((role) => [role.name, role]));
  }

  private async seedUser(user: SeedUser, rolesByName: Map<string, Role>): Promise<void> {
    const roleIds = user.roles.map((roleName) => rolesByName.get(roleName)?.id).filter((roleId): roleId is string => Boolean(roleId));
    const result = await this.createUser.execute({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: user.password,
      roleIds,
    });

    if (isErr(result) && result.error.code !== 'email_already_taken') {
      throw new Error(`Could not seed user "${user.email}": ${result.error.message}`);
    }
  }

  private createDemoUser(index: number): SeedUser {
    const fullName = this.fakeData.personName();
    const [firstName, ...lastNameParts] = fullName.split(' ');
    const lastName = lastNameParts.join(' ');
    const roles: readonly RoleName[] = index % 3 === 0 ? ['manager', 'waiter'] : ['waiter'];

    return {
      email: this.fakeData.email(firstName, lastName),
      firstName,
      lastName: lastName || 'User',
      password: this.fakeData.password(),
      roles,
    };
  }

  private getDemoUserCount(): number {
    const rawCount = this.config.get<string>('IDENTITY_MEMORY_SEED_COUNT') ?? '10';
    const count = Number.parseInt(rawCount, 10);

    return Number.isNaN(count) || count < 0 ? 10 : count;
  }
}

type SeedUser = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roles: readonly RoleName[];
};
