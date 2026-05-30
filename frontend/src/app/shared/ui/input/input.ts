import { booleanAttribute, Component, computed, input, output } from '@angular/core';

export type InputFill = 'default' | 'solid' | 'outline' | 'filled';
export type InputAppearance = 'default' | 'minimal';
export type InputLabelPlacement = 'default' | 'floating';
export type InputSize = 'sm' | 'md' | 'lg';
export type InputType = 'email' | 'number' | 'password' | 'search' | 'tel' | 'text' | 'url';
export type InputVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';

@Component({
  selector: 'app-input',
  templateUrl: './input.html',
  styleUrl: './input.css',
  host: {
    '[attr.id]': 'null',
  },
})
export class Input {
  readonly id = input<string | null>(null);
  readonly label = input('');
  readonly placeholder = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly value = input('');
  readonly name = input('');
  readonly type = input<InputType>('text');
  readonly autocomplete = input<string | null>(null);
  readonly minLength = input<number | null>(null);
  readonly maxLength = input<number | null>(null);
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  readonly step = input<number | 'any' | null>(null);
  readonly variant = input<InputVariant>('primary');
  readonly fill = input<InputFill>('default');
  readonly appearance = input<InputAppearance>('default');
  readonly labelPlacement = input<InputLabelPlacement>('default');
  readonly size = input<InputSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });

  readonly valueChange = output<string>();

  private readonly generatedInputId = `input-${crypto.randomUUID()}`;

  protected readonly inputId = computed(() => this.id() ?? this.generatedInputId);

  protected readonly describedBy = computed(() => {
    const ids = [];

    if (this.hint()) {
      ids.push(`${this.inputId()}-hint`);
    }

    if (this.error()) {
      ids.push(`${this.inputId()}-error`);
    }

    return ids.length > 0 ? ids.join(' ') : null;
  });

  protected readonly fieldClasses = computed(() =>
    [
      'input-field',
      this.labelPlacement() === 'floating' ? 'input-field--floating' : '',
      `input-field--${this.fill()}`,
      `input-field--${this.variant()}`,
      `input-field--${this.appearance()}`,
      this.error() ? 'input-field--error' : '',
    ].join(' '),
  );

  protected readonly classes = computed(() =>
    [
      'input-field__control',
      `input-field__control--${this.size()}`,
      `input-field__control--${this.fill()}`,
      `input-field__control--${this.variant()}`,
      `input-field__control--${this.appearance()}`,
      this.error() ? 'input-field__control--error' : '',
    ].join(' '),
  );

  protected handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }
}
