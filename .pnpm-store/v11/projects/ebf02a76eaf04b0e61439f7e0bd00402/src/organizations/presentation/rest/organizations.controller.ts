import { Controller, Get, UseGuards, Version } from '@nestjs/common';
import { ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard } from '../../../identity/presentation/rest/auth.guard';
import { RolesGuard, RequireRoles } from '../../../identity/presentation/rest/roles.guard';
import { ListOrganizationsUseCase } from '../../application/use-cases/list-organizations.use-case';
import { OrganizationSummaryResponseDto } from './dto/organization-summary-response.dto';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly listOrganizations: ListOrganizationsUseCase) {}

  @Get()
  @Version('1')
  @UseGuards(AuthGuard, RolesGuard)
  @RequireRoles('admin')
  @ApiOkResponse({ type: OrganizationSummaryResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async list(): Promise<OrganizationSummaryResponseDto[]> {
    const organizations = unwrapResultOrThrow(await this.listOrganizations.execute());
    return organizations.map(OrganizationSummaryResponseDto.fromDomain);
  }
}
