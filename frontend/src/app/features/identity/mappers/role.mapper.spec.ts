import type { RoleResponseDto } from '../api/identity-api.models';
import { RoleMapper } from './role.mapper';

describe('RoleMapper', () => {
  it('maps a role response dto to a role model', () => {
    const dto: RoleResponseDto = {
      id: 'role-1',
      name: 'admin',
      description: 'Administrators',
      enabled: true,
      permissions: ['service', 'layout'],
      createdAt: '2026-05-30T16:00:00.000Z',
      updatedAt: '2026-05-30T17:00:00.000Z',
    };

    const role = RoleMapper.fromDto(dto);

    expect(role).toEqual({
      id: 'role-1',
      name: 'admin',
      description: 'Administrators',
      enabled: true,
      permissions: ['service', 'layout'],
      createdAt: new Date('2026-05-30T16:00:00.000Z'),
      updatedAt: new Date('2026-05-30T17:00:00.000Z'),
    });
    expect(role.createdAt).toBeInstanceOf(Date);
    expect(role.updatedAt).toBeInstanceOf(Date);
  });

  it('preserves null role descriptions', () => {
    const dto: RoleResponseDto = {
      id: 'role-1',
      name: 'admin',
      description: null,
      enabled: false,
      permissions: [],
      createdAt: '2026-05-30T16:00:00.000Z',
      updatedAt: '2026-05-30T17:00:00.000Z',
    };

    expect(RoleMapper.fromDto(dto).description).toBeNull();
  });

  it('maps role creation input to a create role request', () => {
    expect(RoleMapper.toCreateRequest({ name: 'admin', description: 'Administrators' })).toEqual({
      name: 'admin',
      description: 'Administrators',
    });
  });

  it('omits null role descriptions from create role requests', () => {
    expect(RoleMapper.toCreateRequest({ name: 'admin', description: null })).toEqual({
      name: 'admin',
    });
  });
});
