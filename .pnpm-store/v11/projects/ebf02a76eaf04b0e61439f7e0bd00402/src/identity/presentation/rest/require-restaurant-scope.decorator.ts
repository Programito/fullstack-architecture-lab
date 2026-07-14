import { SetMetadata } from '@nestjs/common';

export const REQUIRE_RESTAURANT_SCOPE = 'require_restaurant_scope';

export const RequireRestaurantScope = () => SetMetadata(REQUIRE_RESTAURANT_SCOPE, true);
