import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query, Res, UseGuards, Version } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

type HttpResponse = { status(code: number): { send(): void } };

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard } from '../../../identity/presentation/rest/auth.guard';
import { PermissionsGuard, RequirePermissions } from '../../../identity/presentation/rest/permissions.guard';
import { RestaurantAccessGuard } from '../../../identity/presentation/rest/restaurant-access.guard';
import { RequireRestaurantScope } from '../../../identity/presentation/rest/require-restaurant-scope.decorator';
import { ListModifierGroupsUseCase } from '../../application/use-cases/list-modifier-groups.use-case';
import { CreateModifierGroupUseCase } from '../../application/use-cases/create-modifier-group.use-case';
import { UpdateModifierGroupUseCase } from '../../application/use-cases/update-modifier-group.use-case';
import { DeleteModifierGroupUseCase } from '../../application/use-cases/delete-modifier-group.use-case';
import { CreateModifierGroupDto, UpdateModifierGroupDto } from './dto/create-modifier-group.dto';
import { ModifierGroupResponseDto } from './dto/modifier-group-response.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantModifierGroupsController {
  constructor(
    private readonly listUseCase: ListModifierGroupsUseCase,
    private readonly createUseCase: CreateModifierGroupUseCase,
    private readonly updateUseCase: UpdateModifierGroupUseCase,
    private readonly deleteUseCase: DeleteModifierGroupUseCase,
  ) {}

  @Get(':id/modifier-groups')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: ModifierGroupResponseDto, isArray: true })
  @ApiUnauthorizedResponse()
  async listModifierGroups(
    @Param('id') id: string,
    @Query('scope') scope?: 'shared' | 'product',
  ): Promise<ModifierGroupResponseDto[]> {
    return unwrapResultOrThrow(await this.listUseCase.execute({ restaurantId: id, scope })).map(ModifierGroupResponseDto.from);
  }

  @Post(':id/modifier-groups')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiCreatedResponse({ type: ModifierGroupResponseDto })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async createModifierGroup(
    @Param('id') id: string,
    @Body() body: CreateModifierGroupDto,
  ): Promise<ModifierGroupResponseDto> {
    const result = await this.createUseCase.execute({
      restaurantId: id,
      name: body.name,
      selectionType: body.selectionType,
      minSelections: body.minSelections,
      maxSelections: body.maxSelections,
      isRequired: body.isRequired,
      options: body.options,
      scope: body.scope,
      ownerRestaurantProductId: body.ownerRestaurantProductId,
    });
    return ModifierGroupResponseDto.from(unwrapResultOrThrow(result));
  }

  @Patch(':id/modifier-groups/:gid')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: ModifierGroupResponseDto })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async updateModifierGroup(
    @Param('id') id: string,
    @Param('gid') gid: string,
    @Body() body: UpdateModifierGroupDto,
  ): Promise<ModifierGroupResponseDto> {
    const result = await this.updateUseCase.execute({
      restaurantId: id,
      groupId: gid,
      name: body.name,
      selectionType: body.selectionType,
      minSelections: body.minSelections,
      maxSelections: body.maxSelections,
      isRequired: body.isRequired,
      options: body.options,
    });
    return ModifierGroupResponseDto.from(unwrapResultOrThrow(result));
  }

  @Delete(':id/modifier-groups/:gid')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async deleteModifierGroup(
    @Param('id') id: string,
    @Param('gid') gid: string,
    @Res() res: HttpResponse,
  ): Promise<void> {
    unwrapResultOrThrow(await this.deleteUseCase.execute({ restaurantId: id, groupId: gid }));
    res.status(HttpStatus.NO_CONTENT).send();
  }
}
