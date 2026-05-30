import { booleanAttribute, Component, computed, input, output } from '@angular/core';

export type CheckboxSize = 'sm' | 'md' | 'lg';
export type CheckboxVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type CheckboxAppearance = 'default' | 'minimal';

@Component({
  selector: 'app-checkbox',
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.css',
})
export class Checkbox {
  readonly label = input('');
  readonly description = input('');
  readonly name = input('');
  readonly value = input('on');
  readonly variant = input<CheckboxVariant>('primary');
  readonly appearance = input<CheckboxAppearance>('default');
  readonly size = input<CheckboxSize>('md');
  readonly checked = input(false, { transform: booleanAttribute });
  readonly indeterminate = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });

  readonly checkedChange = output<boolean>();

  protected readonly checkboxId = `checkbox-${crypto.randomUUID()}`;

  protected readonly describedBy = computed(() => (this.description() ? `${this.checkboxId}-description` : null));

  protected readonly inputClasses = computed(() =>
    ['checkbox-field__input', this.indeterminate() ? 'checkbox-field__input--indeterminate' : ''].join(' '),
  );

  protected readonly ariaChecked = computed(() => (this.indeterminate() ? 'mixed' : null));

  protected readonly boxClasses = computed(() =>
    [
      'checkbox-field__box',
      `checkbox-field__box--${this.size()}`,
      `checkbox-field__box--${this.variant()}`,
      `checkbox-field__box--${this.appearance()}`,
    ].join(' '),
  );

  protected handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.checkedChange.emit(target.checked);
  }
}
