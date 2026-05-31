import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { Tooltip } from '../tooltip/tooltip';

export type FloatingActionButtonVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type FloatingActionButtonSize = 'sm' | 'md' | 'lg';
export type FloatingActionButtonPosition = 'inline' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type FloatingActionButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-floating-action-button',
  imports: [Icon, Tooltip],
  templateUrl: './floating-action-button.html',
  styleUrl: './floating-action-button.css',
})
export class FloatingActionButton {
  readonly icon = input('add');
  readonly label = input('');
  readonly ariaLabel = input('');
  readonly ariaControls = input<string | null>(null);
  readonly ariaExpanded = input<boolean | null>(null);
  readonly ariaHaspopup = input<string | null>(null);
  readonly extended = input(false, { transform: booleanAttribute });
  readonly variant = input<FloatingActionButtonVariant>('primary');
  readonly size = input<FloatingActionButtonSize>('md');
  readonly position = input<FloatingActionButtonPosition>('inline');
  readonly type = input<FloatingActionButtonType>('button');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });

  readonly pressed = output<void>();

  protected readonly accessibleName = computed(() => this.ariaLabel() || this.label() || this.icon());
  protected readonly tooltip = computed(() => (!this.extended() && this.label() ? this.label() : null));
  protected readonly iconSize = computed(() => (this.size() === 'lg' ? 'lg' : 'md'));
  protected readonly classes = computed(() =>
    [
      'floating-action-button',
      `floating-action-button--${this.size()}`,
      `floating-action-button--${this.variant()}`,
      `floating-action-button--${this.position()}`,
      this.extended() ? 'floating-action-button--extended' : '',
      this.loading() ? 'floating-action-button--loading' : '',
    ].join(' '),
  );

  protected handleClick(): void {
    if (!this.disabled() && !this.loading()) {
      this.pressed.emit();
    }
  }
}
