import { booleanAttribute, Component, computed, input, output } from '@angular/core';

export type AlertFill = 'soft' | 'outline' | 'solid';
export type AlertAppearance = 'default' | 'minimal';
export type AlertRole = 'alert' | 'status' | 'note';
export type AlertSize = 'sm' | 'md' | 'lg';
export type AlertVariant = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'violet';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.html',
  styleUrl: './alert.css',
})
export class Alert {
  readonly title = input('');
  readonly description = input('');
  readonly variant = input<AlertVariant>('neutral');
  readonly fill = input<AlertFill>('soft');
  readonly appearance = input<AlertAppearance>('default');
  readonly size = input<AlertSize>('md');
  readonly role = input<AlertRole>('status');
  readonly dismissible = input(false, { transform: booleanAttribute });
  readonly dismissAriaLabel = input('Cerrar alerta');

  readonly dismissed = output<void>();

  protected readonly classes = computed(() =>
    ['alert', `alert--${this.variant()}`, `alert--${this.fill()}`, `alert--${this.size()}`, `alert--${this.appearance()}`].join(
      ' ',
    ),
  );

  protected readonly resolvedRole = computed(() => (this.role() === 'note' ? null : this.role()));

  protected dismiss(): void {
    this.dismissed.emit();
  }
}
