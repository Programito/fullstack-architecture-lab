import { ApiProperty } from '@nestjs/swagger';

import type { AuthResult } from '../../../application/use-cases/auth.service';
import { UserResponseDto } from './user-response.dto';

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ example: 900 })
  expiresIn!: number;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty({ type: [String], example: ['service', 'layout'] })
  permissions!: string[];

  @ApiProperty({ type: [String], example: ['waiter'] })
  roles!: string[];

  static fromResult(result: AuthResult): AuthResponseDto {
    return {
      accessToken: result.accessToken,
      tokenType: 'Bearer',
      expiresIn: result.accessExpiresIn,
      user: UserResponseDto.fromDomain(result.user),
      permissions: result.permissions,
      roles: result.roles,
    };
  }
}
