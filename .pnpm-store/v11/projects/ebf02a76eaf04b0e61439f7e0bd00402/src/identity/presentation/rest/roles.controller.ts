import { Body, Controller, Get, Param, Patch, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AssignRolePermissionsUseCase } from '../../application/use-cases/assign-role-permissions.use-case';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case';
import { ListPermissionsUseCase } from '../../application/use-cases/list-permissions.use-case';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case';
import { SetRoleEnabledUseCase } from '../../application/use-cases/set-role-enabled.use-case';
import { AuthGuard } from './auth.guard';
import { BlockDemoAccountGuard } from './block-demo-account.guard';
import { BootstrapOrAdminGuard } from './bootstrap-or-admin.guard';
import { RolesGuard, RequireRoles } from './roles.guard';
import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { SetEnabledDto } from './dto/set-enabled.dto';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(
    private readonly createRole: CreateRoleUseCase,
    private readonly listRoles: ListRolesUseCase,
    private readonly listPermissions: ListPermissionsUseCase,
    private readonly assignRolePermissions: AssignRolePermissionsUseCase,
    private readonly setRoleEnabled: SetRoleEnabledUseCase,
  ) {}

  @Post()
  @Version('1')
  @UseGuards(BootstrapOrAdminGuard, BlockDemoAccountGuard)
  @ApiCreatedResponse({ type: RoleResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid role name.' })
  @ApiConflictResponse({ description: 'Role name already taken.' })
  async create(@Body() body: CreateRoleDto): Promise<RoleResponseDto> {
    const role = unwrapResultOrThrow(await this.createRole.execute(body));
    const permissions = unwrapResultOrThrow(await this.listPermissions.execute());
    return RoleResponseDto.fromDomain(role, permissions);
  }

  @Get()
  @Version('1')
  @UseGuards(BootstrapOrAdminGuard)
  @ApiOkResponse({ type: RoleResponseDto, isArray: true })
  async list(): Promise<RoleResponseDto[]> {
    const roles = unwrapResultOrThrow(await this.listRoles.execute());
    const permissions = unwrapResultOrThrow(await this.listPermissions.execute());
    return roles.map((role) => RoleResponseDto.fromDomain(role, permissions));
  }

  @Patch(':id/permissions')
  @Version('1')
  @UseGuards(AuthGuard, RolesGuard, BlockDemoAccountGuard)
  @RequireRoles('admin')
  @ApiBearerAuth()
  @ApiOkResponse({ type: RoleResponseDto })
  async assignPermissions(@Param('id') id: string, @Body() body: AssignRolePermissionsDto): Promise<RoleResponseDto> {
    const role = unwrapResultOrThrow(
      await this.assignRolePermissions.execute({ roleId: id, permissionIds: body.permissionIds }),
    );
    const permissions = unwrapResultOrThrow(await this.listPermissions.execute());
    return RoleResponseDto.fromDomain(role, permissions);
  }

  @Patch(':id/enabled')
  @Version('1')
  @UseGuards(AuthGuard, RolesGuard, BlockDemoAccountGuard)
  @RequireRoles('admin')
  @ApiBearerAuth()
  @ApiOkResponse({ type: RoleResponseDto })
  async setEnabled(@Param('id') id: string, @Body() body: SetEnabledDto): Promise<RoleResponseDto> {
    const role = unwrapResultOrThrow(await this.setRoleEnabled.execute(id, body.enabled));
    const permissions = unwrapResultOrThrow(await this.listPermissions.execute());
    return RoleResponseDto.fromDomain(role, permissions);
  }
}
