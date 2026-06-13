import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ColorModeMenu } from '../../../../shared/ui/color-mode-menu/color-mode-menu';
import { Icon } from '../../../../shared/ui/icon/icon';
import { LanguageSelect } from '../../../../shared/ui/language-select/language-select';
import { RESTAURANT_POS_BASE_PATH, RESTAURANT_POS_DEFAULT_URL, RESTAURANT_POS_SECTIONS } from '../../restaurant-pos.routes';

@Component({
  selector: 'app-restaurant-pos-shell-page',
  imports: [ColorModeMenu, Icon, LanguageSelect, RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  templateUrl: './restaurant-pos-shell-page.html',
})
export class RestaurantPosShellPage {
  protected readonly defaultPath = `/${RESTAURANT_POS_DEFAULT_URL}`;
  protected readonly navigationItems = RESTAURANT_POS_SECTIONS.map((section) => ({
    labelKey: section.labelKey,
    path: `/${RESTAURANT_POS_BASE_PATH}/${section.path}`,
    icon: section.icon,
  }));
}
