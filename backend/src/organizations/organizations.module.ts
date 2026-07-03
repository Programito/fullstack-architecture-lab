import { Module } from '@nestjs/common';

import { IdentityModule } from '../identity/identity.module';
import { ORGANIZATION_READ_REPOSITORY } from './application/ports/organization-read-repository.port';
import { ListOrganizationsUseCase } from './application/use-cases/list-organizations.use-case';
import { PrismaOrganizationReadRepository } from './infrastructure/persistence/prisma-organization-read.repository';
import { OrganizationsController } from './presentation/rest/organizations.controller';

@Module({
  imports: [IdentityModule],
  controllers: [OrganizationsController],
  providers: [
    ListOrganizationsUseCase,
    PrismaOrganizationReadRepository,
    {
      provide: ORGANIZATION_READ_REPOSITORY,
      useExisting: PrismaOrganizationReadRepository,
    },
  ],
})
export class OrganizationsModule {}
