import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FAKE_DATA_GENERATOR, type FakeDataGenerator } from '../../../shared/fake-data/fake-data-generator.port';
import { isErr } from '../../../shared/result/result';
import type { Role } from '../../domain/role.entity';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case';

const MOCK_ROLES = [
  { name: 'admin', description: 'Administrative access.' },
  { name: 'manager', description: 'Team and workflow management.' },
  { name: 'user', description: 'Standard application access.' },
] as const;

const ADMIN_USER = {
  email: 'admin@example.com',
  name: 'Admin User',
  password: 'admin1234',
  roles: ['admin'],
} as const;

@Injectable()
export class InMemoryIdentitySeed implements OnApplicationBootstrap {
  constructor(
    private readonly config: ConfigService,
    private readonly createRole: CreateRoleUseCase,
    private readonly listRoles: ListRolesUseCase,
    private readonly createUser: CreateUserUseCase,
    @Inject(FAKE_DATA_GENERATOR) private readonly fakeData: FakeDataGenerator,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get<string>('IDENTITY_MEMORY_SEED') === 'false') {
      return;
    }

    const rolesByName = await this.seedRoles();

    await this.seedUser(ADMIN_USER, rolesByName);

    for (let index = 0; index < this.getDemoUserCount(); index += 1) {
      await this.seedUser(this.createDemoUser(index), rolesByName);
    }
  }

  private async seedRoles(): Promise<Map<string, Role>> {
    for (const role of MOCK_ROLES) {
      const result = await this.createRole.execute(role);

      if (isErr(result) && result.error.code !== 'role_name_already_taken') {
        throw new Error(`Could not seed role "${role.name}": ${result.error.message}`);
      }
    }

    const roles = await this.listRoles.execute();
    if (isErr(roles)) {
      throw new Error(`Could not list seeded roles: ${roles.error.message}`);
    }

    return new Map(roles.value.map((role) => [role.name, role]));
  }

  private async seedUser(user: SeedUser, rolesByName: Map<string, Role>): Promise<void> {
    const roleIds = user.roles.map((roleName) => rolesByName.get(roleName)?.id).filter((roleId): roleId is string => Boolean(roleId));
    const result = await this.createUser.execute({
      email: user.email,
      name: user.name,
      password: user.password,
      roleIds,
    });

    if (isErr(result) && result.error.code !== 'email_already_taken') {
      throw new Error(`Could not seed user "${user.email}": ${result.error.message}`);
    }
  }

  private createDemoUser(index: number): SeedUser {
    const name = this.fakeData.personName();
    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ');
    const roles = index % 3 === 0 ? ['manager', 'user'] : ['user'];

    return {
      email: this.fakeData.email(firstName, lastName),
      name,
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
  name: string;
  password: string;
  roles: readonly string[];
};
