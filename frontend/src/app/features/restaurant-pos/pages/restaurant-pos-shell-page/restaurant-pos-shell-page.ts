import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ColorModeMenu } from '../../../../shared/ui/color-mode-menu/color-mode-menu';
import { Icon } from '../../../../shared/ui/icon/icon';
import { LanguageSelect } from '../../../../shared/ui/language-select/language-select';

type RestaurantPosNavigationItem = {
  labelKey: string;
  path: string;
  icon: string;
};

@Component({
  selector: 'app-restaurant-pos-shell-page',
  imports: [ColorModeMenu, Icon, LanguageSelect, RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  templateUrl: './restaurant-pos-shell-page.html',
})
export class RestaurantPosShellPage {
  protected readonly navigationItems: readonly RestaurantPosNavigationItem[] = [
    { labelKey: 'restaurantPos.common.service', path: '/restaurant-pos/service', icon: 'room_service' },
    { labelKey: 'restaurantPos.common.kitchen', path: '/restaurant-pos/kitchen', icon: 'restaurant' },
    { labelKey: 'restaurantPos.common.layout', path: '/restaurant-pos/layout', icon: 'dashboard_customize' },
  ];
}
