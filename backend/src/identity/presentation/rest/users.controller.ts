import { Body, Controller, Get, Param, Patch, Post, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AssignUserRolesUseCase } from '../../application/use-cases/assign-user-roles.use-case';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly assignUserRoles: AssignUserRolesUseCase,
  ) {}

  @Post()
  @Version('1')
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid email, name or password.' })
  @ApiConflictResponse({ description: 'Email already taken.' })
  async create(@Body() body: CreateUserDto): Promise<UserResponseDto> {
    const user = unwrapResultOrThrow(await this.createUser.execute(body));

    return UserResponseDto.fromDomain(user);
  }

  @Get()
  @Version('1')
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  async list(): Promise<UserResponseDto[]> {
    const users = unwrapResultOrThrow(await this.listUsers.execute());

    return users.map(UserResponseDto.fromDomain);
  }

  @Patch(':id/roles')
  @Version('1')
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User or role not found.' })
  async assignRoles(@Param('id') id: string, @Body() body: AssignUserRolesDto): Promise<UserResponseDto> {
    const user = unwrapResultOrThrow(await this.assignUserRoles.execute({ userId: id, roleIds: body.roleIds }));

    return UserResponseDto.fromDomain(user);
  }
}
