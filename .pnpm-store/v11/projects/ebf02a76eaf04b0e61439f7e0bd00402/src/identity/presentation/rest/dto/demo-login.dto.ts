import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { ROLE_CATALOG, type RoleName } from '../../../domain/role-catalog';

const DEMO_ROLES = ROLE_CATALOG.map((role) => role.name);

export class DemoLoginDto {
  @ApiProperty({ enum: DEMO_ROLES, example: 'waiter' })
  @IsIn(DEMO_ROLES)
  role!: RoleName;
}
