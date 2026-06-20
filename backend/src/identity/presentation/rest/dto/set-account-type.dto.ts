import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { ACCOUNT_TYPES, type AccountType } from '../../../domain/account-type';

export class SetAccountTypeDto {
  @ApiProperty({ enum: ACCOUNT_TYPES, example: 'demo' })
  @IsIn(ACCOUNT_TYPES)
  accountType!: AccountType;
}
