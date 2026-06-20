import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { AuthSession } from '../../../domain/auth-session.entity';

export class SessionResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  userId!: string;
  @ApiProperty()
  enabled!: boolean;
  @ApiProperty()
  expiresAt!: string;
  @ApiProperty()
  absoluteExpiresAt!: string;
  @ApiPropertyOptional({ nullable: true })
  revokedAt!: string | null;
  @ApiProperty()
  createdAt!: string;

  static fromDomain(session: AuthSession): SessionResponseDto {
    return {
      id: session.id,
      userId: session.userId,
      enabled: session.enabled,
      expiresAt: session.expiresAt.toISOString(),
      absoluteExpiresAt: session.absoluteExpiresAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
    };
  }
}
