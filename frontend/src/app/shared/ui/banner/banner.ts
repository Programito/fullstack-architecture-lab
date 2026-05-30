import { booleanAttribute, Component, computed, input, output } from '@angular/core';

export type BannerFill = 'soft' | 'outline' | 'solid' | 'gradient';
export type BannerAppearance = 'default' | 'minimal';
export type BannerSize = 'md' | 'lg';
export type BannerVariant = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'violet';

@Component({
  selector: 'app-banner',
  templateUrl: './banner.html',
  styleUrl: './banner.css',
})
export class Banner {
  readonly eyebrow = input('');
  readonly title = input('');
  readonly description = input('');
  readonly variant = input<BannerVariant>('primary');
  readonly fill = input<BannerFill>('soft');
  readonly appearance = input<BannerAppearance>('default');
  readonly size = input<BannerSize>('md');
  readonly actionLabel = input('');
  readonly secondaryActionLabel = input('');
  readonly dismissible = input(false, { transform: booleanAttribute });
  readonly dismissAriaLabel = input('Cerrar banner');

  readonly action = output<void>();
  readonly secondaryAction = output<void>();
  readonly dismissed = output<void>();

  protected readonly hasActions = computed(() => Boolean(this.actionLabel() || this.secondaryActionLabel()));

  protected readonly classes = computed(() =>
    ['banner', `banner--${this.variant()}`, `banner--${this.fill()}`, `banner--${this.size()}`, `banner--${this.appearance()}`].join(
      ' ',
    ),
  );

  protected emitAction(): void {
    this.action.emit();
  }

  protected emitSecondaryAction(): void {
    this.secondaryAction.emit();
  }

  protected dismiss(): void {
    this.dismissed.emit();
  }
}
