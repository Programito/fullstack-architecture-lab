import { Body, Controller, Delete, HttpStatus, Param, Patch, Post, Req, Res, UseGuards, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

type HttpResponse = { status(code: number): HttpResponse };

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard, type AuthenticatedRequest } from '../../../identity/presentation/rest/auth.guard';
import { AuditService } from '../../../observability/application/audit.service';
import { auditContext } from '../../../observability/application/audit-context';
import { PermissionsGuard, RequirePermissions } from '../../../identity/presentation/rest/permissions.guard';
import { RestaurantAccessGuard } from '../../../identity/presentation/rest/restaurant-access.guard';
import { RequireRestaurantScope } from '../../../identity/presentation/rest/require-restaurant-scope.decorator';
import { CreateComboSlotUseCase } from '../../application/use-cases/create-combo-slot.use-case';
import { UpdateComboSlotUseCase } from '../../application/use-cases/update-combo-slot.use-case';
import { DeleteComboSlotUseCase } from '../../application/use-cases/delete-combo-slot.use-case';
import { CreateComboSlotDto } from './dto/create-combo-slot.dto';
import { UpdateComboSlotDto } from './dto/update-combo-slot.dto';
import { ComboSlotResponseDto } from './dto/combo-slot-response.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantComboSlotsController {
  constructor(
    private readonly createComboSlot: CreateComboSlotUseCase,
    private readonly updateComboSlot: UpdateComboSlotUseCase,
    private readonly deleteComboSlot: DeleteComboSlotUseCase,
    private readonly audit: AuditService,
  ) {}

  @Post(':id/products/:productId/combo-slots')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiCreatedResponse({ type: ComboSlotResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async createSlot(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body() body: CreateComboSlotDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ComboSlotResponseDto> {
    const result = await this.createComboSlot.execute({
      restaurantId: id,
      productId,
      name: body.name,
      nameI18n: body.nameI18n,
      minSelections: body.minSelections,
      maxSelections: body.maxSelections,
      isRequired: body.isRequired,
      options: body.options,
    });
    const slot = ComboSlotResponseDto.from(unwrapResultOrThrow(result));
    await this.audit.record({
      ...auditContext(request, id),
      event: 'menu.combo-slot.created',
      message: `Combo slot ${slot.name} created.`,
      result: 'succeeded',
      entityType: 'combo-slot',
      entityId: slot.id,
      entityLabel: slot.name,
      changedFields: ['name', 'nameI18n', 'minSelections', 'maxSelections', 'isRequired', 'options'],
      metadata: { productId, slotId: slot.id },
    });
    return slot;
  }

  @Patch(':id/products/:productId/combo-slots/:slotId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: ComboSlotResponseDto })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async updateSlot(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Param('slotId') slotId: string,
    @Body() body: UpdateComboSlotDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ComboSlotResponseDto> {
    const result = await this.updateComboSlot.execute({
      restaurantId: id,
      productId,
      slotId,
      name: body.name,
      nameI18n: body.nameI18n,
      minSelections: body.minSelections,
      maxSelections: body.maxSelections,
      isRequired: body.isRequired,
      options: body.options,
    });
    const slot = ComboSlotResponseDto.from(unwrapResultOrThrow(result));
    await this.audit.record({
      ...auditContext(request, id),
      event: 'menu.combo-slot.updated',
      message: `Combo slot ${slot.name} updated.`,
      result: 'succeeded',
      entityType: 'combo-slot',
      entityId: slotId,
      entityLabel: slot.name,
      changedFields: collectChangedFields(body, ['name', 'nameI18n', 'minSelections', 'maxSelections', 'isRequired', 'options']),
      metadata: { productId, slotId },
    });
    return slot;
  }

  @Delete(':id/products/:productId/combo-slots/:slotId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async deleteSlot(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Param('slotId') slotId: string,
    @Req() request: AuthenticatedRequest,
    @Res() res: HttpResponse,
  ): Promise<void> {
    unwrapResultOrThrow(await this.deleteComboSlot.execute({ restaurantId: id, productId, slotId }));
    await this.audit.record({
      ...auditContext(request, id),
      event: 'menu.combo-slot.deleted',
      message: `Combo slot ${slotId} deleted.`,
      result: 'succeeded',
      entityType: 'combo-slot',
      entityId: slotId,
      entityLabel: slotId,
      changedFields: ['deleted'],
      metadata: { productId, slotId },
    });
    res.status(HttpStatus.NO_CONTENT);
  }
}

function collectChangedFields<T extends object>(input: T, keys: Array<keyof T>): string[] {
  return keys.filter((key) => input[key] !== undefined).map((key) => String(key));
}
