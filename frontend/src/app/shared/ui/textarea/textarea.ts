import { booleanAttribute, Component, computed, input, numberAttribute, output } from '@angular/core';

export type TextareaFill = 'default' | 'solid' | 'outline' | 'filled';
export type TextareaAppearance = 'default' | 'minimal';
export type TextareaLabelPlacement = 'default' | 'floating';
export type TextareaSize = 'sm' | 'md' | 'lg';
export type TextareaVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';

@Component({
  selector: 'app-textarea',
  templateUrl: './textarea.html',
  styleUrl: './textarea.css',
})
export class Textarea {
  readonly label = input('');
  readonly placeholder = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly value = input('');
  readonly name = input('');
  readonly variant = input<TextareaVariant>('primary');
  readonly fill = input<TextareaFill>('default');
  readonly appearance = input<TextareaAppearance>('default');
  readonly labelPlacement = input<TextareaLabelPlacement>('default');
  readonly size = input<TextareaSize>('md');
  readonly rows = input(4, { transform: numberAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly resize = input(true, { transform: booleanAttribute });

  readonly valueChange = output<string>();

  protected readonly textareaId = `textarea-${crypto.randomUUID()}`;

  protected readonly describedBy = computed(() => {
    const ids = [];

    if (this.hint()) {
      ids.push(`${this.textareaId}-hint`);
    }

    if (this.error()) {
      ids.push(`${this.textareaId}-error`);
    }

    return ids.length > 0 ? ids.join(' ') : null;
  });

  protected readonly fieldClasses = computed(() =>
    [
      'textarea-field',
      this.labelPlacement() === 'floating' ? 'textarea-field--floating' : '',
      `textarea-field--${this.fill()}`,
      `textarea-field--${this.variant()}`,
      `textarea-field--${this.appearance()}`,
      this.error() ? 'textarea-field--error' : '',
    ].join(' '),
  );

  protected readonly classes = computed(() =>
    [
      'textarea-field__control',
      `textarea-field__control--${this.size()}`,
      `textarea-field__control--${this.fill()}`,
      `textarea-field__control--${this.variant()}`,
      `textarea-field__control--${this.appearance()}`,
      this.resize() ? 'resize-y' : 'resize-none',
      this.error() ? 'textarea-field__control--error' : '',
    ].join(' '),
  );

  protected handleInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.valueChange.emit(target.value);
  }
}
