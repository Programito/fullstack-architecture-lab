import { Body, Controller, Get, Post, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(
    private readonly createRole: CreateRoleUseCase,
    private readonly listRoles: ListRolesUseCase,
  ) {}

  @Post()
  @Version('1')
  @ApiCreatedResponse({ type: RoleResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid role name.' })
  @ApiConflictResponse({ description: 'Role name already taken.' })
  async create(@Body() body: CreateRoleDto): Promise<RoleResponseDto> {
    const role = unwrapResultOrThrow(await this.createRole.execute(body));

    return RoleResponseDto.fromDomain(role);
  }

  @Get()
  @Version('1')
  @ApiOkResponse({ type: RoleResponseDto, isArray: true })
  async list(): Promise<RoleResponseDto[]> {
    const roles = unwrapResultOrThrow(await this.listRoles.execute());

    return roles.map(RoleResponseDto.fromDomain);
  }
}
