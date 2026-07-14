import type { OrganizationSummary } from '../../domain/organization-summary.model';

export const ORGANIZATION_READ_REPOSITORY = Symbol('ORGANIZATION_READ_REPOSITORY');

export interface OrganizationReadRepository {
  listOrganizations(): Promise<OrganizationSummary[]>;
}
