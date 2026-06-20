import { Body, Controller, Get, Param, Patch, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { ListPermissionsUseCase } from '../../application/use-cases/list-permissions.use-case';
import { SetPermissionEnabledUseCase } from '../../application/use-cases/set-permission-enabled.use-case';
import { AuthGuard } from './auth.guard';
import { RolesGuard, RequireRoles } from './roles.guard';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { SetEnabledDto } from './dto/set-enabled.dto';

@ApiTags('permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly listPermissions: ListPermissionsUseCase,
    private readonly setPermissionEnabled: SetPermissionEnabledUseCase,
  ) {}

  @Get()
  @Version('1')
  @ApiOkResponse({ type: PermissionResponseDto, isArray: true })
  async list(): Promise<PermissionResponseDto[]> {
    const permissions = unwrapResultOrThrow(await this.listPermissions.execute());
    return permissions.map(PermissionResponseDto.fromDomain);
  }

  @Patch(':id/enabled')
  @Version('1')
  @UseGuards(AuthGuard, RolesGuard)
  @RequireRoles('admin')
  @ApiBearerAuth()
  @ApiOkResponse({ type: PermissionResponseDto })
  async setEnabled(@Param('id') id: string, @Body() body: SetEnabledDto): Promise<PermissionResponseDto> {
    return PermissionResponseDto.fromDomain(
      unwrapResultOrThrow(await this.setPermissionEnabled.execute(id, body.enabled)),
    );
  }
}
