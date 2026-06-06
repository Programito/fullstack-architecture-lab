import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ColorModeMenu } from '../../../../shared/ui/color-mode-menu/color-mode-menu';
import { LanguageSelect } from '../../../../shared/ui/language-select/language-select';

@Component({
  selector: 'app-restaurant-pos-service-page',
  imports: [ColorModeMenu, LanguageSelect, RouterLink, TranslocoPipe],
  templateUrl: './restaurant-pos-service-page.html',
})
export class RestaurantPosServicePage {}
