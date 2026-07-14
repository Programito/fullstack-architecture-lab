import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { Permission } from '../../../domain/permission.entity';

export class PermissionResponseDto {
  @ApiProperty({ example: '3a1f93a3-e312-4f89-8658-602516d28e2f' })
  id!: string;

  @ApiProperty({ example: 'service' })
  name!: string;

  @ApiPropertyOptional({ example: 'Acceso al módulo de servicio.', nullable: true })
  description!: string | null;

  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: '2026-05-30T16:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-05-30T16:00:00.000Z' })
  updatedAt!: string;

  static fromDomain(permission: Permission): PermissionResponseDto {
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      enabled: permission.enabled,
      createdAt: permission.createdAt.toISOString(),
      updatedAt: permission.updatedAt.toISOString(),
    };
  }
}
