import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
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

@Component({
  selector: 'app-restaurant-pos-shell-page',
  imports: [ColorModeMenu, Icon, LanguageSelect, RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  templateUrl: './restaurant-pos-shell-page.html',
  styleUrl: './restaurant-pos-shell-page.css',
  host: {
    '[class.restaurant-pos-shell-page--logging-out]': 'loggingOut()',
  },
})
export class RestaurantPosShellPage {
  private readonly identity = inject(IdentitySessionStore);
  private readonly api = inject(IdentityApiService);
  private readonly router = inject(Router);
  private readonly logoutTransitionMs = 180;

  protected readonly navigationItems = computed(() =>
    RESTAURANT_POS_SECTIONS.filter((section) => this.identity.hasPermission(section.requiredPermission)).map((section) => ({
      labelKey: section.labelKey,
      path: `/${RESTAURANT_POS_BASE_PATH}/${section.path}`,
      icon: section.icon,
    })),
  );

  protected readonly defaultPath = computed(() => {
    const permissions = this.identity.permissions();
    return permissions.length > 0 ? firstAllowedRestaurantPosUrl(permissions) : `/${RESTAURANT_POS_ACCESS_URL}`;
  });
  protected readonly isAdmin = computed(() => this.identity.hasRole('admin'));
  protected readonly loggingOut = signal(false);

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
