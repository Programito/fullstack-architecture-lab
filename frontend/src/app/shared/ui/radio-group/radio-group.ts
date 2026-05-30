import { booleanAttribute, Component, computed, input, output } from '@angular/core';

export type RadioGroupLayout = 'vertical' | 'horizontal';
export type RadioGroupSize = 'sm' | 'md' | 'lg';
export type RadioGroupVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type RadioGroupAppearance = 'default' | 'minimal';

export type RadioGroupOption = {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
};

@Component({
  selector: 'app-radio-group',
  templateUrl: './radio-group.html',
  styleUrl: './radio-group.css',
})
export class RadioGroup {
  readonly label = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly name = input('');
  readonly value = input('');
  readonly options = input<RadioGroupOption[]>([]);
  readonly variant = input<RadioGroupVariant>('primary');
  readonly appearance = input<RadioGroupAppearance>('default');
  readonly size = input<RadioGroupSize>('md');
  readonly layout = input<RadioGroupLayout>('vertical');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });

  readonly valueChange = output<string>();

  protected readonly radioGroupId = `radio-group-${crypto.randomUUID()}`;
  private readonly generatedName = `${this.radioGroupId}-name`;

  protected readonly controlName = computed(() => this.name() || this.generatedName);

  protected readonly describedBy = computed(() => {
    if (this.error()) {
      return `${this.radioGroupId}-error`;
    }

    if (this.hint()) {
      return `${this.radioGroupId}-hint`;
    }

    return null;
  });

  protected readonly classes = computed(() =>
    [
      'radio-group',
      `radio-group--${this.layout()}`,
      `radio-group--${this.size()}`,
      `radio-group--${this.variant()}`,
      `radio-group--${this.appearance()}`,
      this.error() ? 'radio-group--error' : '',
      this.disabled() ? 'radio-group--disabled' : '',
    ].join(' '),
  );

  protected optionId(index: number): string {
    return `${this.radioGroupId}-option-${index}`;
  }

  protected optionDescriptionId(option: RadioGroupOption, index: number): string | null {
    return option.description ? `${this.optionId(index)}-description` : null;
  }

  protected optionClasses(option: RadioGroupOption): string {
    return [
      'radio-group__option',
      option.value === this.value() ? 'radio-group__option--selected' : '',
      this.disabled() || option.disabled ? 'radio-group__option--disabled' : '',
    ].join(' ');
  }

  protected selectOption(option: RadioGroupOption): void {
    if (this.disabled() || option.disabled || option.value === this.value()) {
      return;
    }

    this.valueChange.emit(option.value);
  }
}
