import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { Permission } from '../../../domain/permission.entity';
import type { Role } from '../../../domain/role.entity';

export class RoleResponseDto {
  @ApiProperty({ example: '3a1f93a3-e312-4f89-8658-602516d28e2f' })
  id!: string;

  @ApiProperty({ example: 'admin' })
  name!: string;

  @ApiPropertyOptional({ example: 'Users with administrative access.', nullable: true })
  description!: string | null;

  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ type: [String], example: ['service', 'layout'] })
  permissions!: string[];

  @ApiProperty({ example: '2026-05-30T16:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-05-30T16:00:00.000Z' })
  updatedAt!: string;

  static fromDomain(role: Role, permissions: Permission[]): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      enabled: role.enabled,
      permissions: role.permissionIds
        .map((permissionId) => permissions.find((permission) => permission.id === permissionId)?.name)
        .filter((name): name is string => Boolean(name)),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }
}
