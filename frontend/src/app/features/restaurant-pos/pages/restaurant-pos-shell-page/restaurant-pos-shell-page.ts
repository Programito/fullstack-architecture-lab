import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { type IsActiveMatchOptions, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter, map } from 'rxjs';
import { IdentitySessionStore } from '../../../identity/identity-session.store';
import { IdentityApiService } from '../../../identity/api/identity-api.service';
import { ColorModeMenu } from '../../../../shared/ui/color-mode-menu/color-mode-menu';
import { Icon } from '../../../../shared/ui/icon/icon';
import { LanguageSelect } from '../../../../shared/ui/language-select/language-select';
import {
  firstAllowedRestaurantPosUrl,
  RESTAURANT_POS_ACCESS_URL,
  RESTAURANT_POS_BASE_PATH,
  RESTAURANT_POS_SECTIONS,
} from '../../restaurant-pos.routes';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { OrderSyncService } from '../../state/order-sync.service';
import { OrderWriteService } from '../../state/order-write.service';

@Component({
  selector: 'app-restaurant-pos-shell-page',
  imports: [ColorModeMenu, Icon, LanguageSelect, RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  templateUrl: './restaurant-pos-shell-page.html',
  styleUrl: './restaurant-pos-shell-page.css',
  providers: [OrderSyncService, OrderWriteService],
  host: {
    '[class.restaurant-pos-shell-page--logging-out]': 'loggingOut()',
  },
})
export class RestaurantPosShellPage {
  private readonly identity = inject(IdentitySessionStore);
  private readonly api = inject(IdentityApiService);
  private readonly router = inject(Router);
  protected readonly restaurantContext = inject(RestaurantContextStore);
  // injecting starts the polling for the whole feature lifetime
  private readonly _orderSync = inject(OrderSyncService);
  private readonly logoutTransitionMs = 180;

  protected readonly navigationItems = computed(() =>
    RESTAURANT_POS_SECTIONS.filter((section) => this.identity.hasPermission(section.requiredPermission)).map((section) => ({
      labelKey: section.labelKey,
      path: `/${RESTAURANT_POS_BASE_PATH}/${section.path}`,
      icon: section.icon,
    })),
  );

  protected readonly navActiveOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    fragment: 'ignored',
    matrixParams: 'ignored',
  };

  protected readonly defaultPath = computed(() => {
    const permissions = this.identity.permissions();
    return permissions.length > 0 ? firstAllowedRestaurantPosUrl(permissions) : `/${RESTAURANT_POS_ACCESS_URL}`;
  });
  protected readonly isAdmin = computed(() => this.identity.hasRole('admin'));
  protected readonly loggingOut = signal(false);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  // User administration is org-wide, not scoped to a restaurant, so it must
  // stay reachable even before an active restaurant has been selected.
  protected readonly isAdminUsersRoute = computed(() => this.currentUrl().includes('/admin/users'));
  protected readonly needsRestaurantSelection = computed(
    () =>
      !this.isAdminUsersRoute() &&
      !this.restaurantContext.isLoading() &&
      this.restaurantContext.multipleRestaurants() &&
      !this.restaurantContext.activeRestaurant(),
  );

  constructor() {
    this.restaurantContext.load();
  }

  protected selectRestaurant(id: string): void {
    this.restaurantContext.setActiveRestaurantId(id);
    void this.router.navigateByUrl(this.defaultPath());
  }

  protected retryRestaurantContext(): void {
    this.restaurantContext.load();
  }

  protected logout(): void {
    if (this.loggingOut()) return;

    this.loggingOut.set(true);
    const startedAt = Date.now();
    const finish = () => {
      const remaining = Math.max(0, this.logoutTransitionMs - (Date.now() - startedAt));
      window.setTimeout(() => this.finishLogout(), remaining);
    };

    this.api.logout().subscribe({
      next: () => finish(),
      error: () => finish(),
    });
  }

  private finishLogout(): void {
    this.identity.clear();
    void this.router.navigate(['/login']);
  }
}
