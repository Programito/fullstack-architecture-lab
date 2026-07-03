import { Inject, Injectable } from '@nestjs/common';

import { ok, type Result } from '../../../shared/result/result';
import { ORGANIZATION_READ_REPOSITORY, type OrganizationReadRepository } from '../ports/organization-read-repository.port';
import type { OrganizationSummary } from '../../domain/organization-summary.model';

@Injectable()
export class ListOrganizationsUseCase {
  constructor(
    @Inject(ORGANIZATION_READ_REPOSITORY) private readonly organizations: OrganizationReadRepository,
  ) {}

  async execute(): Promise<Result<OrganizationSummary[], never>> {
    return ok(await this.organizations.listOrganizations());
  }
}
