import { booleanAttribute, Component, computed, input } from '@angular/core';

export type FormFieldSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.html',
  styleUrl: './form-field.css',
  host: {
    '[attr.id]': 'null',
  },
})
export class FormField {
  readonly controlId = input('');
  readonly label = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly size = input<FormFieldSize>('md');
  readonly required = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly hintId = computed(() => `${this.controlId()}-hint`);
  protected readonly errorId = computed(() => `${this.controlId()}-error`);

  protected readonly classes = computed(() =>
    [
      'form-field',
      `form-field--${this.size()}`,
      this.error() ? 'form-field--error' : '',
      this.disabled() ? 'form-field--disabled' : '',
    ].join(' '),
  );
}
