import { describe, expect, it, vi } from 'vitest';

import { isOk, type Result } from '../../../shared/result/result';
import { ListOrganizationsUseCase } from './list-organizations.use-case';
import type { OrganizationReadRepository } from '../ports/organization-read-repository.port';
import type { OrganizationSummary } from '../../domain/organization-summary.model';

describe('ListOrganizationsUseCase', () => {
  it('returns the organizations from the repository', async () => {
    const organizations: OrganizationSummary[] = [{ id: 'org-1', name: 'MesaFlow Group' }];
    const listOrganizations = vi.fn().mockResolvedValue(organizations);
    const repository = { listOrganizations } as unknown as OrganizationReadRepository;
    const useCase = new ListOrganizationsUseCase(repository);

    const result: Result<OrganizationSummary[], never> = await useCase.execute();

    expect(isOk(result)).toBe(true);
    expect(listOrganizations).toHaveBeenCalled();
  });
});
