import type { UserResponseDto } from '../api/identity-api.models';
import { UserMapper } from './user.mapper';

describe('UserMapper', () => {
  it('maps a user response dto to a user model', () => {
    const dto: UserResponseDto = {
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin User',
      roles: ['role-1', 'role-2'],
      createdAt: '2026-05-30T16:00:00.000Z',
      updatedAt: '2026-05-30T17:00:00.000Z',
    };

    const user = UserMapper.fromDto(dto);

    expect(user).toEqual({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin User',
      roleIds: ['role-1', 'role-2'],
      createdAt: new Date('2026-05-30T16:00:00.000Z'),
      updatedAt: new Date('2026-05-30T17:00:00.000Z'),
    });
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('copies role ids when mapping from a user response dto', () => {
    const dto: UserResponseDto = {
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin User',
      roles: ['role-1'],
      createdAt: '2026-05-30T16:00:00.000Z',
      updatedAt: '2026-05-30T17:00:00.000Z',
    };

    const user = UserMapper.fromDto(dto);

    dto.roles.push('role-2');

    expect(user.roleIds).toEqual(['role-1']);
  });

  it('maps user creation input to a create user request', () => {
    const roleIds = ['role-1', 'role-2'];
    const request = UserMapper.toCreateRequest({
      email: 'admin@example.com',
      name: 'Admin User',
      password: 'supersecret',
      roleIds,
    });

    roleIds.push('role-3');

    expect(request).toEqual({
      email: 'admin@example.com',
      name: 'Admin User',
      password: 'supersecret',
      roleIds: ['role-1', 'role-2'],
    });
  });

  it('omits undefined role ids from create user requests', () => {
    expect(
      UserMapper.toCreateRequest({
        email: 'admin@example.com',
        name: 'Admin User',
        password: 'supersecret',
      }),
    ).toEqual({
      email: 'admin@example.com',
      name: 'Admin User',
      password: 'supersecret',
    });
  });

  it('maps role ids to an assign user roles request without sharing array references', () => {
    const roleIds = ['role-1', 'role-2'];
    const request = UserMapper.toAssignRolesRequest(roleIds);

    roleIds.push('role-3');

    expect(request).toEqual({
      roleIds: ['role-1', 'role-2'],
    });
  });
});
