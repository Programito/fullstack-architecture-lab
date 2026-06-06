import { booleanAttribute, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { ColorModeService } from '../../theme/color-mode.service';
import { Icon } from '../icon/icon';

export type ColorModeMenuSize = 'sm' | 'md';
export type ColorModeMenuAppearance = 'default' | 'minimal';

@Component({
  selector: 'app-color-mode-menu',
  imports: [Icon],
  templateUrl: './color-mode-menu.html',
  styleUrl: './color-mode-menu.css',
})
export class ColorModeMenu {
  private readonly colorMode = inject(ColorModeService);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  readonly appearance = input<ColorModeMenuAppearance>('minimal');
  readonly size = input<ColorModeMenuSize>('sm');
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() =>
    [
      'color-mode-menu',
      `color-mode-menu--${this.size()}`,
      `color-mode-menu--${this.appearance()}`,
    ].join(' '),
  );

  protected readonly triggerAriaLabel = computed(() => this.translate(this.colorMode.mode() === 'dark' ? 'colorMode.switchToLight' : 'colorMode.switchToDark'));

  protected readonly triggerIcon = computed(() => (this.colorMode.mode() === 'dark' ? 'dark_mode' : 'light_mode'));

  protected toggle(): void {
    if (!this.disabled()) {
      this.colorMode.toggle();
    }
  }

  private translate(key: string, params?: Record<string, unknown>): string {
    this.activeLang();
    return this.transloco.translate(key, params);
  }
}
