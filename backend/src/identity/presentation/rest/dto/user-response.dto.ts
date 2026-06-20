import { ApiProperty } from '@nestjs/swagger';

import type { User } from '../../../domain/user.entity';
import type { AccountType } from '../../../domain/account-type';

export class UserResponseDto {
  @ApiProperty({ example: 'b5cc3f7d-9ba7-4c07-84ce-1ce906f6ef1f' })
  id!: string;

  @ApiProperty({ example: 'admin@example.com' })
  email!: string;

  @ApiProperty({ example: 'Admin' })
  firstName!: string;

  @ApiProperty({ example: 'User' })
  lastName!: string;

  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ enum: ['regular', 'demo', 'system', 'test'], example: 'regular' })
  accountType!: AccountType;

  @ApiProperty({ example: ['3a1f93a3-e312-4f89-8658-602516d28e2f'], type: [String] })
  roles!: string[];

  @ApiProperty({ example: '2026-05-30T16:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-05-30T16:00:00.000Z' })
  updatedAt!: string;

  static fromDomain(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      enabled: user.enabled,
      accountType: user.accountType,
      roles: user.roleIds,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
