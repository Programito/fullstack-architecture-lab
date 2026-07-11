import { Body, Controller, Delete, Get, Header, HttpStatus, Param, Patch, Post, Put, Req, Res, UseGuards, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

type HttpResponse = { status(code: number): HttpResponse };

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard, type AuthenticatedRequest } from '../../../identity/presentation/rest/auth.guard';
import { AuditService } from '../../../observability/application/audit.service';
import { auditContext } from '../../../observability/application/audit-context';
import { PermissionsGuard, RequirePermissions } from '../../../identity/presentation/rest/permissions.guard';
import { RestaurantAccessGuard } from '../../../identity/presentation/rest/restaurant-access.guard';
import { RequireRestaurantScope } from '../../../identity/presentation/rest/require-restaurant-scope.decorator';
import { GetRestaurantMenuUseCase } from '../../application/use-cases/get-restaurant-menu.use-case';
import { SetRestaurantMenuItemAvailabilityUseCase } from '../../application/use-cases/set-restaurant-menu-item-availability.use-case';
import { CreateMenuSectionUseCase } from '../../application/use-cases/create-menu-section.use-case';
import { UpdateMenuSectionUseCase } from '../../application/use-cases/update-menu-section.use-case';
import { DeleteMenuSectionUseCase } from '../../application/use-cases/delete-menu-section.use-case';
import { AddMenuSectionItemUseCase } from '../../application/use-cases/add-menu-section-item.use-case';
import { UpdateMenuSectionItemUseCase } from '../../application/use-cases/update-menu-section-item.use-case';
import { RemoveMenuSectionItemUseCase } from '../../application/use-cases/remove-menu-section-item.use-case';
import { ReorderMenuSectionsUseCase } from '../../application/use-cases/reorder-menu-sections.use-case';
import { ReorderMenuSectionItemsUseCase } from '../../application/use-cases/reorder-menu-section-items.use-case';
import { RestaurantMenuResponseDto } from './dto/restaurant-menu-response.dto';
import { SetMenuItemAvailabilityDto } from './dto/set-menu-item-availability.dto';
import { MenuSectionResponseDto } from './dto/menu-section-response.dto';
import { MenuItemResponseDto } from './dto/menu-item-response.dto';
import { CreateMenuSectionDto } from './dto/create-menu-section.dto';
import { UpdateMenuSectionDto } from './dto/update-menu-section.dto';
import { AddMenuSectionItemDto } from './dto/add-menu-section-item.dto';
import { UpdateMenuSectionItemDto } from './dto/update-menu-section-item.dto';
import { ReorderMenuItemsDto } from './dto/reorder-menu-items.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantMenuController {
  constructor(
    private readonly getRestaurantMenu: GetRestaurantMenuUseCase,
    private readonly setMenuItemAvailability: SetRestaurantMenuItemAvailabilityUseCase,
    private readonly createMenuSection: CreateMenuSectionUseCase,
    private readonly updateMenuSection: UpdateMenuSectionUseCase,
    private readonly deleteMenuSection: DeleteMenuSectionUseCase,
    private readonly addMenuSectionItem: AddMenuSectionItemUseCase,
    private readonly updateMenuSectionItem: UpdateMenuSectionItemUseCase,
    private readonly removeMenuSectionItem: RemoveMenuSectionItemUseCase,
    private readonly reorderMenuSections: ReorderMenuSectionsUseCase,
    private readonly reorderMenuSectionItems: ReorderMenuSectionItemsUseCase,
    private readonly audit: AuditService,
  ) {}

  @Get(':id/menu')
  // must-revalidate permite a la app movil cachear la carta y revalidar con ETag (304)
  // en cada sondeo pese a llevar Authorization (regla de caches HTTP); el ETag debil lo
  // genera Express por defecto sobre el cuerpo JSON.
  @Header('Cache-Control', 'private, max-age=0, must-revalidate')
  @Version('1')
  @UseGuards(AuthGuard, RestaurantAccessGuard)
  @RequireRestaurantScope()
  @ApiOkResponse({ type: RestaurantMenuResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Restaurant not found.' })
  async menu(@Param('id') id: string): Promise<RestaurantMenuResponseDto> {
    return RestaurantMenuResponseDto.fromDomain(unwrapResultOrThrow(await this.getRestaurantMenu.execute(id)));
  }

  @Patch(':id/products/:restaurantProductId/availability')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse({ description: 'Availability updated.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  @ApiNotFoundResponse({ description: 'Product not found in this restaurant.' })
  async setItemAvailability(
    @Param('id') restaurantId: string,
    @Param('restaurantProductId') restaurantProductId: string,
    @Body() body: SetMenuItemAvailabilityDto,
  ): Promise<void> {
    unwrapResultOrThrow(await this.setMenuItemAvailability.execute(restaurantId, restaurantProductId, body.available));
  }

  @Post(':id/menus/:menuId/sections')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiCreatedResponse({ type: MenuSectionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid section data.' })
  @ApiNotFoundResponse({ description: 'Menu not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async createSection(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Body() body: CreateMenuSectionDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<MenuSectionResponseDto> {
    const section = unwrapResultOrThrow(
      await this.createMenuSection.execute({
        restaurantId: id,
        menuId,
        name: body.name,
        nameI18n: body.nameI18n,
        isVisible: body.isVisible,
      }),
    );
    await this.audit.record({
      ...auditContext(request, id),
      event: 'menu.section.created',
      message: `Section ${section.name} created.`,
      result: 'succeeded',
      entityType: 'menu-section',
      entityId: section.id,
      entityLabel: section.name,
      changedFields: ['name', 'nameI18n', 'isVisible'],
      metadata: { menuId, sectionId: section.id, name: section.name },
    });
    return section;
  }

  @Patch(':id/menus/:menuId/sections/:sectionId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: MenuSectionResponseDto })
  @ApiNotFoundResponse({ description: 'Section not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async updateSection(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: UpdateMenuSectionDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<MenuSectionResponseDto> {
    const section = unwrapResultOrThrow(
      await this.updateMenuSection.execute({
        restaurantId: id,
        menuId,
        sectionId,
        name: body.name,
        nameI18n: body.nameI18n,
        isVisible: body.isVisible,
      }),
    );
    await this.audit.record({
      ...auditContext(request, id),
      event: 'menu.section.updated',
      message: `Section ${section.name} updated.`,
      result: 'succeeded',
      entityType: 'menu-section',
      entityId: sectionId,
      entityLabel: section.name,
      changedFields: collectChangedFields(body, ['name', 'nameI18n', 'isVisible']),
      metadata: { menuId, sectionId, name: section.name },
    });
    return section;
  }

  @Delete(':id/menus/:menuId/sections/:sectionId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse({ description: 'Section deleted.' })
  @ApiNotFoundResponse({ description: 'Section not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async deleteSection(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Req() request: AuthenticatedRequest,
    @Res() res: HttpResponse,
  ): Promise<void> {
    unwrapResultOrThrow(await this.deleteMenuSection.execute({ restaurantId: id, menuId, sectionId }));
    await this.audit.record({
      ...auditContext(request, id),
      event: 'menu.section.deleted',
      message: `Section ${sectionId} deleted.`,
      result: 'succeeded',
      entityType: 'menu-section',
      entityId: sectionId,
      entityLabel: sectionId,
      changedFields: ['deleted'],
      metadata: { menuId, sectionId },
    });
    res.status(HttpStatus.NO_CONTENT);
  }

  @Post(':id/menus/:menuId/sections/:sectionId/items')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiCreatedResponse({ type: MenuItemResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid item data.' })
  @ApiNotFoundResponse({ description: 'Section not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async addSectionItem(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: AddMenuSectionItemDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<MenuItemResponseDto> {
    const item = unwrapResultOrThrow(
      await this.addMenuSectionItem.execute({
        restaurantId: id,
        menuId,
        sectionId,
        restaurantProductId: body.restaurantProductId,
        displayNameOverride: body.displayNameOverride,
        priceOverrideCents: body.priceOverrideCents,
      }),
    );
    await this.audit.record({
      ...auditContext(request, id),
      event: 'menu.section-item.created',
      message: `Menu item added to section ${sectionId}.`,
      result: 'succeeded',
      entityType: 'menu-section',
      entityId: sectionId,
      entityLabel: sectionId,
      changedFields: ['items'],
      metadata: { menuId, sectionId, itemId: item.id, restaurantProductId: body.restaurantProductId },
    });
    return item;
  }

  @Patch(':id/menus/:menuId/sections/:sectionId/items/:itemId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse({ type: MenuItemResponseDto })
  @ApiNotFoundResponse({ description: 'Item not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async updateSectionItem(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateMenuSectionItemDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<MenuItemResponseDto> {
    const item = unwrapResultOrThrow(
      await this.updateMenuSectionItem.execute({
        restaurantId: id,
        menuId,
        sectionId,
        itemId,
        displayNameOverride: body.displayNameOverride,
        priceOverrideCents: body.priceOverrideCents,
        isVisible: body.isVisible,
      }),
    );
    await this.audit.record({
      ...auditContext(request, id),
      event: 'menu.section-item.updated',
      message: `Menu item ${itemId} updated.`,
      result: 'succeeded',
      entityType: 'menu-section',
      entityId: sectionId,
      entityLabel: sectionId,
      changedFields: collectChangedFields(body, ['displayNameOverride', 'priceOverrideCents', 'isVisible']),
      metadata: { menuId, sectionId, itemId },
    });
    return item;
  }

  @Delete(':id/menus/:menuId/sections/:sectionId/items/:itemId')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse({ description: 'Item removed.' })
  @ApiNotFoundResponse({ description: 'Item not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async removeSectionItem(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @Req() request: AuthenticatedRequest,
    @Res() res: HttpResponse,
  ): Promise<void> {
    unwrapResultOrThrow(await this.removeMenuSectionItem.execute({ restaurantId: id, menuId, sectionId, itemId }));
    await this.audit.record({
      ...auditContext(request, id),
      event: 'menu.section-item.deleted',
      message: `Menu item ${itemId} removed.`,
      result: 'succeeded',
      entityType: 'menu-section',
      entityId: sectionId,
      entityLabel: sectionId,
      changedFields: ['items'],
      metadata: { menuId, sectionId, itemId },
    });
    res.status(HttpStatus.NO_CONTENT);
  }

  @Put(':id/menus/:menuId/sections/reorder')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse({ description: 'Sections reordered.' })
  @ApiNotFoundResponse({ description: 'Menu not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async reorderSections(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Body() body: ReorderMenuItemsDto,
    @Res() res: HttpResponse,
  ): Promise<void> {
    unwrapResultOrThrow(await this.reorderMenuSections.execute({ restaurantId: id, menuId, items: body.items }));
    res.status(HttpStatus.NO_CONTENT);
  }

  @Put(':id/menus/:menuId/sections/:sectionId/items/reorder')
  @Version('1')
  @UseGuards(AuthGuard, PermissionsGuard, RestaurantAccessGuard)
  @RequirePermissions('menu')
  @RequireRestaurantScope()
  @ApiOkResponse({ description: 'Items reordered.' })
  @ApiNotFoundResponse({ description: 'Section not found.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  async reorderItems(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: ReorderMenuItemsDto,
    @Res() res: HttpResponse,
  ): Promise<void> {
    unwrapResultOrThrow(await this.reorderMenuSectionItems.execute({ restaurantId: id, menuId, sectionId, items: body.items }));
    res.status(HttpStatus.NO_CONTENT);
  }
}

function collectChangedFields<T extends object>(input: T, keys: Array<keyof T>): string[] {
  return keys.filter((key) => input[key] !== undefined).map((key) => String(key));
}
