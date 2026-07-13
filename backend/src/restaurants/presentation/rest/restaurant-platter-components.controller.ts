import { Body, Controller, Delete, HttpStatus, Param, Patch, Post, Req, Res, UseGuards, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

type HttpResponse = { status(code: number): { send(): void } };

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard, type AuthenticatedRequest } from '../../../identity/presentation/rest/auth.guard';
import { AuditService } from '../../../observability/application/audit.service';
import { auditContext } from '../../../observability/application/audit-context';
import { PermissionsGuard, RequirePermissions } from '../../../identity/presentation/rest/permissions.guard';
import { RestaurantAccessGuard } from '../../../identity/presentation/rest/restaurant-access.guard';
import { RequireRestaurantScope } from '../../../identity/presentation/rest/require-restaurant-scope.decorator';
import { CreatePlatterComponentUseCase } from '../../application/use-cases/create-platter-component.use-case';
import { UpdatePlatterComponentUseCase } from '../../application/use-cases/update-platter-component.use-case';
import { DeletePlatterComponentUseCase } from '../../application/use-cases/delete-platter-component.use-case';
import { CreatePlatterComponentDto } from './dto/create-platter-component.dto';
import { UpdatePlatterComponentDto } from './dto/update-platter-component.dto';
import { PlatterComponentResponseDto } from './dto/platter-component-response.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantPlatterComponentsController {
  constructor(
    private readonly createPlatterComponent: CreatePlatterComponentUseCase,
    private readonly updatePlatterComponent: UpdatePlatterComponentUseCase,
    private readonly deletePlatterComponent: DeletePlatterComponentUseCase,
    private readonly audit: AuditService,
  ) {}

  @Post(':id/products/:productId/platter-components')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiCreatedResponse({ type: PlatterComponentResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async createComponent(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body() body: CreatePlatterComponentDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PlatterComponentResponseDto> {
    const result = await this.createPlatterComponent.execute({
      restaurantId: id,
      productId,
      name: body.name,
      nameI18n: body.nameI18n,
      componentProductId: body.componentProductId,
      quantity: body.quantity,
      isRemovable: body.isRemovable,
      isReplaceable: body.isReplaceable,
    });
    const component = PlatterComponentResponseDto.from(unwrapResultOrThrow(result));
    await this.audit.record({
      ...auditContext(request, id),
      event: 'menu.platter-component.created',
      message: `Platter component ${component.name} created.`,
      result: 'succeeded',
      entityType: 'platter-component',
      entityId: component.id,
      entityLabel: component.name,
      changedFields: ['name', 'nameI18n', 'componentProductId', 'quantity', 'isRemovable', 'isReplaceable'],
      metadata: { productId, componentId: component.id },
    });
    return component;
  }

  @Patch(':id/products/:productId/platter-components/:componentId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: PlatterComponentResponseDto })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async updateComponent(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Param('componentId') componentId: string,
    @Body() body: UpdatePlatterComponentDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PlatterComponentResponseDto> {
    const result = await this.updatePlatterComponent.execute({
      restaurantId: id,
      productId,
      componentId,
      name: body.name,
      nameI18n: body.nameI18n,
      componentProductId: body.componentProductId,
      quantity: body.quantity,
      isRemovable: body.isRemovable,
      isReplaceable: body.isReplaceable,
    });
    const component = PlatterComponentResponseDto.from(unwrapResultOrThrow(result));
    await this.audit.record({
      ...auditContext(request, id),
      event: 'menu.platter-component.updated',
      message: `Platter component ${component.name} updated.`,
      result: 'succeeded',
      entityType: 'platter-component',
      entityId: componentId,
      entityLabel: component.name,
      changedFields: collectChangedFields(body, ['name', 'nameI18n', 'componentProductId', 'quantity', 'isRemovable', 'isReplaceable']),
      metadata: { productId, componentId },
    });
    return component;
  }

  @Delete(':id/products/:productId/platter-components/:componentId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async deleteComponent(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Param('componentId') componentId: string,
    @Req() request: AuthenticatedRequest,
    @Res() res: HttpResponse,
  ): Promise<void> {
    unwrapResultOrThrow(await this.deletePlatterComponent.execute({ restaurantId: id, productId, componentId }));
    await this.audit.record({
      ...auditContext(request, id),
      event: 'menu.platter-component.deleted',
      message: `Platter component ${componentId} deleted.`,
      result: 'succeeded',
      entityType: 'platter-component',
      entityId: componentId,
      entityLabel: componentId,
      changedFields: ['deleted'],
      metadata: { productId, componentId },
    });
    res.status(HttpStatus.NO_CONTENT).send();
  }
}

function collectChangedFields<T extends object>(input: T, keys: Array<keyof T>): string[] {
  return keys.filter((key) => input[key] !== undefined).map((key) => String(key));
}
