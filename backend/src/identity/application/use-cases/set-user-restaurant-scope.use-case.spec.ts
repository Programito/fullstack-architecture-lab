import { describe, expect, it, vi } from 'vitest';

import { isErr, isOk } from '../../../shared/result/result';
import { SetUserRestaurantScopeUseCase } from './set-user-restaurant-scope.use-case';
import type { User } from '../../domain/user.entity';
import type { UserRepository } from '../ports/user-repository.port';
import type { UserRoleAssignmentRepository } from '../ports/user-role-assignment-repository.port';

describe('SetUserRestaurantScopeUseCase', () => {
  it('replaces the scope for the user roles when the user exists', async () => {
    const user = { id: 'user-1', roleIds: ['role-a', 'role-b'] } as User;
    const users = { findById: vi.fn().mockResolvedValue(user) } as unknown as UserRepository;
    const replaceScopeForUser = vi.fn().mockResolvedValue(undefined);
    const assignments = { replaceScopeForUser } as unknown as UserRoleAssignmentRepository;
    const useCase = new SetUserRestaurantScopeUseCase(users, assignments);

    const result = await useCase.execute({ userId: 'user-1', organizationId: 'org-1', restaurantId: 'rest-1' });

    expect(isOk(result)).toBe(true);
    expect(replaceScopeForUser).toHaveBeenCalledWith('user-1', ['role-a', 'role-b'], {
      organizationId: 'org-1',
      restaurantId: 'rest-1',
    });
  });

  it('defaults restaurantId to null when omitted, for an organization-wide scope', async () => {
    const user = { id: 'user-1', roleIds: ['role-a'] } as User;
    const users = { findById: vi.fn().mockResolvedValue(user) } as unknown as UserRepository;
    const replaceScopeForUser = vi.fn().mockResolvedValue(undefined);
    const assignments = { replaceScopeForUser } as unknown as UserRoleAssignmentRepository;
    const useCase = new SetUserRestaurantScopeUseCase(users, assignments);

    await useCase.execute({ userId: 'user-1', organizationId: 'org-1' });

    expect(replaceScopeForUser).toHaveBeenCalledWith('user-1', ['role-a'], {
      organizationId: 'org-1',
      restaurantId: null,
    });
  });

  it('returns an error when the user does not exist', async () => {
    const users = { findById: vi.fn().mockResolvedValue(null) } as unknown as UserRepository;
    const replaceScopeForUser = vi.fn();
    const assignments = { replaceScopeForUser } as unknown as UserRoleAssignmentRepository;
    const useCase = new SetUserRestaurantScopeUseCase(users, assignments);

    const result = await useCase.execute({ userId: 'missing', organizationId: 'org-1' });

    expect(isErr(result)).toBe(true);
    expect(replaceScopeForUser).not.toHaveBeenCalled();
  });
});
