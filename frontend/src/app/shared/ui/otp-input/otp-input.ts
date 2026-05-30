import { booleanAttribute, Component, computed, input, model, numberAttribute, output } from '@angular/core';
import { FormField, type FormFieldSize } from '../form-field/form-field';

export type OtpInputFill = 'default' | 'solid' | 'outline' | 'filled';
export type OtpInputAppearance = 'default' | 'minimal';
export type OtpInputSize = FormFieldSize;
export type OtpInputType = 'numeric' | 'text';
export type OtpInputVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';

@Component({
  selector: 'app-otp-input',
  imports: [FormField],
  templateUrl: './otp-input.html',
  styleUrl: './otp-input.css',
  host: {
    '[attr.id]': 'null',
  },
})
export class OtpInput {
  readonly label = input('Codigo');
  readonly hint = input('');
  readonly error = input('');
  readonly length = input(6, { transform: normalizeLength });
  readonly type = input<OtpInputType>('numeric');
  readonly autocomplete = input('one-time-code');
  readonly variant = input<OtpInputVariant>('primary');
  readonly fill = input<OtpInputFill>('default');
  readonly appearance = input<OtpInputAppearance>('default');
  readonly size = input<OtpInputSize>('md');
  readonly masked = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });

  readonly value = model('');
  readonly completed = output<string>();

  private readonly generatedId = `otp-input-${crypto.randomUUID()}`;

  protected readonly inputId = this.generatedId;
  protected readonly indexes = computed(() => Array.from({ length: this.length() }, (_, index) => index));
  protected readonly chars = computed(() => this.normalizeValue(this.value()).split(''));
  protected readonly inputType = computed(() => (this.masked() ? 'password' : 'text'));
  protected readonly inputMode = computed(() => (this.type() === 'numeric' ? 'numeric' : 'text'));
  protected readonly pattern = computed(() => (this.type() === 'numeric' ? '[0-9]*' : null));

  protected readonly describedBy = computed(() => {
    if (this.error()) {
      return `${this.inputId}-error`;
    }

    return this.hint() ? `${this.inputId}-hint` : null;
  });

  protected readonly classes = computed(() =>
    [
      'otp-input',
      `otp-input--${this.size()}`,
      `otp-input--${this.fill()}`,
      `otp-input--${this.appearance()}`,
      `otp-input--${this.variant()}`,
      this.error() ? 'otp-input--error' : '',
      this.disabled() ? 'otp-input--disabled' : '',
    ].join(' '),
  );

  protected cellId(index: number): string {
    return `${this.inputId}-${index}`;
  }

  protected charAt(index: number): string {
    return this.chars()[index] ?? '';
  }

  protected handleInput(event: Event, index: number): void {
    const target = event.target as HTMLInputElement;
    const nextChar = this.filterValue(target.value).slice(-1);
    const chars = this.chars();

    chars[index] = nextChar;
    this.commit(chars.join(''));

    if (nextChar) {
      this.focusCell(index + 1);
    }
  }

  protected handleKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.charAt(index)) {
      event.preventDefault();
      this.focusCell(index - 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.focusCell(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.focusCell(index + 1);
    }
  }

  protected handlePaste(event: ClipboardEvent, index: number): void {
    event.preventDefault();

    const pastedValue = this.filterValue(event.clipboardData?.getData('text') ?? '');
    const chars = this.chars();

    for (let offset = 0; offset < pastedValue.length && index + offset < this.length(); offset += 1) {
      chars[index + offset] = pastedValue[offset];
    }

    this.commit(chars.join(''));
    this.focusCell(Math.min(index + pastedValue.length, this.length() - 1));
  }

  private commit(value: string): void {
    const nextValue = this.normalizeValue(value);
    this.value.set(nextValue);

    if (nextValue.length === this.length()) {
      this.completed.emit(nextValue);
    }
  }

  private normalizeValue(value: string): string {
    return this.filterValue(value).slice(0, this.length());
  }

  private filterValue(value: string): string {
    return this.type() === 'numeric' ? value.replace(/\D/g, '') : value.replace(/\s/g, '');
  }

  private focusCell(index: number): void {
    const nextIndex = Math.max(0, Math.min(index, this.length() - 1));
    document.getElementById(this.cellId(nextIndex))?.focus();
  }
}

function normalizeLength(value: unknown): number {
  const length = numberAttribute(value);

  return Number.isFinite(length) && length > 0 ? Math.floor(length) : 6;
}
