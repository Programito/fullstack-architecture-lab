import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { EVENT_BUS } from '../shared/events/event-bus.port';
import { InMemoryEventBus } from '../shared/events/in-memory-event-bus';
import { FAKE_DATA_GENERATOR } from '../shared/fake-data/fake-data-generator.port';
import { FakerFakeDataGenerator } from '../shared/fake-data/infrastructure/faker-fake-data-generator';
import { AUTH_SESSION_REPOSITORY } from './application/ports/auth-session-repository.port';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { PERMISSION_REPOSITORY } from './application/ports/permission-repository.port';
import { ROLE_REPOSITORY } from './application/ports/role-repository.port';
import { USER_REPOSITORY } from './application/ports/user-repository.port';
import { AssignRolePermissionsUseCase } from './application/use-cases/assign-role-permissions.use-case';
import { AssignUserRolesUseCase } from './application/use-cases/assign-user-roles.use-case';
import { AuthService } from './application/use-cases/auth.service';
import { DeveloperAccessService } from './application/use-cases/developer-access.service';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { ListPermissionsUseCase } from './application/use-cases/list-permissions.use-case';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { SetPermissionEnabledUseCase } from './application/use-cases/set-permission-enabled.use-case';
import { SetRoleEnabledUseCase } from './application/use-cases/set-role-enabled.use-case';
import { SetUserEnabledUseCase } from './application/use-cases/set-user-enabled.use-case';
import { SetUserAccountTypeUseCase } from './application/use-cases/set-user-account-type.use-case';
import { InMemoryAuthSessionRepository } from './infrastructure/persistence/in-memory-auth-session.repository';
import { InMemoryPermissionRepository } from './infrastructure/persistence/in-memory-permission.repository';
import { InMemoryRoleRepository } from './infrastructure/persistence/in-memory-role.repository';
import { InMemoryUserRepository } from './infrastructure/persistence/in-memory-user.repository';
import { PrismaAuthSessionRepository } from './infrastructure/persistence/prisma-auth-session.repository';
import { PrismaPermissionRepository } from './infrastructure/persistence/prisma-permission.repository';
import { PrismaRoleRepository } from './infrastructure/persistence/prisma-role.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { InMemoryIdentitySeed } from './infrastructure/seed/in-memory-identity.seed';
import { AuthTokenService } from './infrastructure/security/auth-token.service';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password-hasher';
import { AuthController } from './presentation/rest/auth.controller';
import { AuthGuard } from './presentation/rest/auth.guard';
import { PermissionsController } from './presentation/rest/permissions.controller';
import { PermissionsGuard } from './presentation/rest/permissions.guard';
import { RolesController } from './presentation/rest/roles.controller';
import { RolesGuard } from './presentation/rest/roles.guard';
import { SessionsController } from './presentation/rest/sessions.controller';
import { UsersController } from './presentation/rest/users.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [UsersController, RolesController, PermissionsController, AuthController, SessionsController],
  providers: [
    AuthService,
    DeveloperAccessService,
    AuthTokenService,
    AuthGuard,
    RolesGuard,
    PermissionsGuard,
    CreateUserUseCase,
    ListUsersUseCase,
    AssignUserRolesUseCase,
    CreateRoleUseCase,
    ListRolesUseCase,
    ListPermissionsUseCase,
    AssignRolePermissionsUseCase,
    SetUserEnabledUseCase,
    SetUserAccountTypeUseCase,
    SetRoleEnabledUseCase,
    SetPermissionEnabledUseCase,
    InMemoryUserRepository,
    InMemoryRoleRepository,
    InMemoryPermissionRepository,
    InMemoryAuthSessionRepository,
    PrismaUserRepository,
    PrismaRoleRepository,
    PrismaPermissionRepository,
    PrismaAuthSessionRepository,
    BcryptPasswordHasher,
    InMemoryEventBus,
    FakerFakeDataGenerator,
    InMemoryIdentitySeed,
    {
      provide: USER_REPOSITORY,
      inject: [ConfigService, InMemoryUserRepository, PrismaUserRepository],
      useFactory: (
        config: ConfigService,
        memory: InMemoryUserRepository,
        prisma: PrismaUserRepository,
      ) => config.get<string>('IDENTITY_PERSISTENCE') === 'memory' ? memory : prisma,
    },
    {
      provide: ROLE_REPOSITORY,
      inject: [ConfigService, InMemoryRoleRepository, PrismaRoleRepository],
      useFactory: (
        config: ConfigService,
        memory: InMemoryRoleRepository,
        prisma: PrismaRoleRepository,
      ) => config.get<string>('IDENTITY_PERSISTENCE') === 'memory' ? memory : prisma,
    },
    {
      provide: PERMISSION_REPOSITORY,
      inject: [ConfigService, InMemoryPermissionRepository, PrismaPermissionRepository],
      useFactory: (
        config: ConfigService,
        memory: InMemoryPermissionRepository,
        prisma: PrismaPermissionRepository,
      ) => config.get<string>('IDENTITY_PERSISTENCE') === 'memory' ? memory : prisma,
    },
    {
      provide: AUTH_SESSION_REPOSITORY,
      inject: [ConfigService, InMemoryAuthSessionRepository, PrismaAuthSessionRepository],
      useFactory: (
        config: ConfigService,
        memory: InMemoryAuthSessionRepository,
        prisma: PrismaAuthSessionRepository,
      ) => config.get<string>('IDENTITY_PERSISTENCE') === 'memory' ? memory : prisma,
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
  exports: [
    DeveloperAccessService,
    AuthGuard,
    AuthTokenService,
    USER_REPOSITORY,
    ROLE_REPOSITORY,
    PERMISSION_REPOSITORY,
    AUTH_SESSION_REPOSITORY,
  ],
})
export class IdentityModule {}
