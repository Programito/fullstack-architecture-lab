import { Body, Controller, Get, Param, Patch, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AssignUserRolesUseCase } from '../../application/use-cases/assign-user-roles.use-case';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { SetUserEnabledUseCase } from '../../application/use-cases/set-user-enabled.use-case';
import { SetUserAccountTypeUseCase } from '../../application/use-cases/set-user-account-type.use-case';
import { SetUserRestaurantScopeUseCase } from '../../application/use-cases/set-user-restaurant-scope.use-case';
import { AuthGuard } from './auth.guard';
import { BlockDemoAccountGuard } from './block-demo-account.guard';
import { BootstrapOrAdminGuard } from './bootstrap-or-admin.guard';
import { RolesGuard, RequireRoles } from './roles.guard';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { SetEnabledDto } from './dto/set-enabled.dto';
import { SetAccountTypeDto } from './dto/set-account-type.dto';
import { SetUserScopeDto } from './dto/set-user-scope.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly assignUserRoles: AssignUserRolesUseCase,
    private readonly setUserEnabled: SetUserEnabledUseCase,
    private readonly setUserAccountType: SetUserAccountTypeUseCase,
    private readonly setUserRestaurantScope: SetUserRestaurantScopeUseCase,
  ) {}

  @Post()
  @Version('1')
  @UseGuards(BootstrapOrAdminGuard, BlockDemoAccountGuard)
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid email, name or password.' })
  @ApiConflictResponse({ description: 'Email already taken.' })
  async create(@Body() body: CreateUserDto): Promise<UserResponseDto> {
    const user = unwrapResultOrThrow(await this.createUser.execute(body));

    return UserResponseDto.fromDomain(user);
  }

  @Get()
  @Version('1')
  @UseGuards(BootstrapOrAdminGuard)
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  async list(): Promise<UserResponseDto[]> {
    const users = unwrapResultOrThrow(await this.listUsers.execute());

    return users.map(UserResponseDto.fromDomain);
  }

  @Patch(':id/roles')
  @Version('1')
  @UseGuards(BootstrapOrAdminGuard, BlockDemoAccountGuard)
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User or role not found.' })
  async assignRoles(@Param('id') id: string, @Body() body: AssignUserRolesDto): Promise<UserResponseDto> {
    const user = unwrapResultOrThrow(await this.assignUserRoles.execute({ userId: id, roleIds: body.roleIds }));

    return UserResponseDto.fromDomain(user);
  }

  @Patch(':id/enabled')
  @Version('1')
  @UseGuards(AuthGuard, RolesGuard, BlockDemoAccountGuard)
  @RequireRoles('admin')
  @ApiOkResponse({ type: UserResponseDto })
  async setEnabled(@Param('id') id: string, @Body() body: SetEnabledDto): Promise<UserResponseDto> {
    return UserResponseDto.fromDomain(unwrapResultOrThrow(await this.setUserEnabled.execute(id, body.enabled)));
  }

  @Patch(':id/account-type')
  @Version('1')
  @UseGuards(AuthGuard, RolesGuard, BlockDemoAccountGuard)
  @RequireRoles('admin')
  @ApiOkResponse({ type: UserResponseDto })
  async setAccountType(@Param('id') id: string, @Body() body: SetAccountTypeDto): Promise<UserResponseDto> {
    return UserResponseDto.fromDomain(
      unwrapResultOrThrow(await this.setUserAccountType.execute(id, body.accountType)),
    );
  }

  @Patch(':id/scope')
  @Version('1')
  @UseGuards(AuthGuard, RolesGuard, BlockDemoAccountGuard)
  @RequireRoles('admin')
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found.' })
  async setScope(@Param('id') id: string, @Body() body: SetUserScopeDto): Promise<UserResponseDto> {
    return UserResponseDto.fromDomain(
      unwrapResultOrThrow(
        await this.setUserRestaurantScope.execute({
          userId: id,
          organizationId: body.organizationId,
          restaurantId: body.restaurantId,
        }),
      ),
    );
  }
}
