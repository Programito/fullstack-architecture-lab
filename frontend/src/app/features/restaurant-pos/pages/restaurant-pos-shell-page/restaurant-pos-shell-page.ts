import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { IdentitySessionStore } from '../../../identity/identity-session.store';
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
})
export class RestaurantPosShellPage {
  private readonly identity = inject(IdentitySessionStore);

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
}
