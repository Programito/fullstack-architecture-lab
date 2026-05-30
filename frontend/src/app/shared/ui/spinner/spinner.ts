import { booleanAttribute, Component, computed, input } from '@angular/core';

export type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerTextPosition = 'left' | 'right';
export type SpinnerType = 'ring' | 'dual-ring' | 'dots' | 'bars' | 'pulse';
export type SpinnerVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type SpinnerAppearance = 'default' | 'minimal';

@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.html',
  styleUrl: './spinner.css',
})
export class Spinner {
  readonly size = input<SpinnerSize>('md');
  readonly type = input<SpinnerType>('ring');
  readonly variant = input<SpinnerVariant>('primary');
  readonly appearance = input<SpinnerAppearance>('default');
  readonly label = input('Cargando');
  readonly text = input('');
  readonly textPosition = input<SpinnerTextPosition>('right');
  readonly decorative = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() =>
    [
      'spinner',
      `spinner--${this.size()}`,
      `spinner--${this.type()}`,
      `spinner--${this.variant()}`,
      `spinner--${this.appearance()}`,
      this.text() ? `spinner--text-${this.textPosition()}` : '',
    ].join(' '),
  );
  protected readonly role = computed(() => (this.decorative() ? null : 'status'));
  protected readonly ariaLabel = computed(() => (this.decorative() || this.text() ? null : this.label()));
  protected readonly ariaHidden = computed(() => (this.decorative() ? 'true' : null));
}
