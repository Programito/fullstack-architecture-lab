import { ApiProperty } from '@nestjs/swagger';

import type { OrganizationSummary } from '../../../domain/organization-summary.model';

export class OrganizationSummaryResponseDto {
  @ApiProperty({ example: 'org-demo' })
  id!: string;

  @ApiProperty({ example: 'MesaFlow Group' })
  name!: string;

  static fromDomain(organization: OrganizationSummary): OrganizationSummaryResponseDto {
    return { ...organization };
  }
}
