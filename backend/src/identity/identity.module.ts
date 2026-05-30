import { Module } from '@nestjs/common';

import { EVENT_BUS } from '../shared/events/event-bus.port';
import { InMemoryEventBus } from '../shared/events/in-memory-event-bus';
import { FAKE_DATA_GENERATOR } from '../shared/fake-data/fake-data-generator.port';
import { FakerFakeDataGenerator } from '../shared/fake-data/infrastructure/faker-fake-data-generator';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { ROLE_REPOSITORY } from './application/ports/role-repository.port';
import { USER_REPOSITORY } from './application/ports/user-repository.port';
import { AssignUserRolesUseCase } from './application/use-cases/assign-user-roles.use-case';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { InMemoryRoleRepository } from './infrastructure/persistence/in-memory-role.repository';
import { InMemoryUserRepository } from './infrastructure/persistence/in-memory-user.repository';
import { InMemoryIdentitySeed } from './infrastructure/seed/in-memory-identity.seed';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { RolesController } from './presentation/rest/roles.controller';
import { UsersController } from './presentation/rest/users.controller';

@Module({
  controllers: [UsersController, RolesController],
  providers: [
    CreateUserUseCase,
    ListUsersUseCase,
    AssignUserRolesUseCase,
    CreateRoleUseCase,
    ListRolesUseCase,
    InMemoryUserRepository,
    InMemoryRoleRepository,
    BcryptPasswordHasher,
    InMemoryEventBus,
    FakerFakeDataGenerator,
    InMemoryIdentitySeed,
    {
      provide: USER_REPOSITORY,
      useExisting: InMemoryUserRepository,
    },
    {
      provide: ROLE_REPOSITORY,
      useExisting: InMemoryRoleRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useExisting: BcryptPasswordHasher,
    },
    {
      provide: EVENT_BUS,
      useExisting: InMemoryEventBus,
    },
    {
      provide: FAKE_DATA_GENERATOR,
      useExisting: FakerFakeDataGenerator,
    },
  ],
})
export class IdentityModule {}
