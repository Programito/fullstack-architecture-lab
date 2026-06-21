import { Module } from '@nestjs/common';

import { GetRestaurantFloorsUseCase } from './application/use-cases/get-restaurant-floors.use-case';
import { GetRestaurantMenuUseCase } from './application/use-cases/get-restaurant-menu.use-case';
import { ListRestaurantReservationsUseCase } from './application/use-cases/list-restaurant-reservations.use-case';
import { ListRestaurantsUseCase } from './application/use-cases/list-restaurants.use-case';
import { CreateFloorElementUseCase } from './application/use-cases/create-floor-element.use-case';
import { ReorderFloorElementsUseCase } from './application/use-cases/reorder-floor-elements.use-case';
import { UpdateFloorElementUseCase } from './application/use-cases/update-floor-element.use-case';
import { UpdateRestaurantFloorUseCase } from './application/use-cases/update-restaurant-floor.use-case';
import { RESTAURANT_READ_REPOSITORY } from './application/ports/restaurant-read-repository.port';
import { DemoRestaurantReadRepository } from './infrastructure/demo-restaurant-read.repository';
import { RestaurantsController } from './presentation/rest/restaurants.controller';

@Module({
  controllers: [RestaurantsController],
  providers: [
    ListRestaurantsUseCase,
    GetRestaurantMenuUseCase,
    GetRestaurantFloorsUseCase,
    ListRestaurantReservationsUseCase,
    CreateFloorElementUseCase,
    ReorderFloorElementsUseCase,
    UpdateFloorElementUseCase,
    UpdateRestaurantFloorUseCase,
    DemoRestaurantReadRepository,
    {
      provide: RESTAURANT_READ_REPOSITORY,
      useExisting: DemoRestaurantReadRepository,
    },
  ],
})
export class RestaurantsModule {}
