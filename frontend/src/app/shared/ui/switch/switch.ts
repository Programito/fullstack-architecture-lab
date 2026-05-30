import { booleanAttribute, Component, computed, input, output } from '@angular/core';

export type SwitchSize = 'sm' | 'md' | 'lg';
export type SwitchVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type SwitchAppearance = 'default' | 'minimal';

@Component({
  selector: 'app-switch',
  templateUrl: './switch.html',
  styleUrl: './switch.css',
})
export class Switch {
  readonly label = input('');
  readonly description = input('');
  readonly name = input('');
  readonly value = input('on');
  readonly variant = input<SwitchVariant>('primary');
  readonly appearance = input<SwitchAppearance>('default');
  readonly size = input<SwitchSize>('md');
  readonly checked = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });

  readonly checkedChange = output<boolean>();

  protected readonly switchId = `switch-${crypto.randomUUID()}`;

  protected readonly describedBy = computed(() => (this.description() ? `${this.switchId}-description` : null));

  protected readonly trackClasses = computed(() =>
    [
      'switch-field__track',
      `switch-field__track--${this.size()}`,
      `switch-field__track--${this.variant()}`,
      `switch-field__track--${this.appearance()}`,
    ].join(' '),
  );

  protected handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.checkedChange.emit(target.checked);
  }
}
