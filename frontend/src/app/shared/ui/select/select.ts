import { booleanAttribute, Component, computed, effect, input, output, signal } from '@angular/core';

export type SelectFill = 'default' | 'solid' | 'outline' | 'filled';
export type SelectAppearance = 'default' | 'minimal';
export type SelectMode = 'native' | 'dialog';
export type SelectSize = 'sm' | 'md' | 'lg';
export type SelectVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';

export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

@Component({
  selector: 'app-select',
  templateUrl: './select.html',
  styleUrl: './select.css',
})
export class Select {
  readonly label = input('');
  readonly placeholder = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly value = input('');
  readonly dialogTitle = input('');
  readonly name = input('');
  readonly options = input<SelectOption[]>([]);
  readonly variant = input<SelectVariant>('primary');
  readonly fill = input<SelectFill>('default');
  readonly appearance = input<SelectAppearance>('default');
  readonly mode = input<SelectMode>('native');
  readonly size = input<SelectSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });

  readonly valueChange = output<string>();

  protected readonly selectId = `select-${crypto.randomUUID()}`;
  protected readonly dialogTitleId = `${this.selectId}-dialog-title`;
  protected readonly isDialogOpen = signal(false);
  protected readonly selectedValue = signal('');

  constructor() {
    effect(() => {
      this.selectedValue.set(this.value());
    });
  }

  protected readonly describedBy = computed(() => {
    const ids = [];

    if (this.hint()) {
      ids.push(`${this.selectId}-hint`);
    }

    if (this.error()) {
      ids.push(`${this.selectId}-error`);
    }

    return ids.length > 0 ? ids.join(' ') : null;
  });

  protected readonly fieldClasses = computed(() =>
    ['select-field', `select-field--${this.fill()}`, `select-field--${this.appearance()}`].join(' '),
  );

  protected readonly selectedOption = computed(() =>
    this.options().find((option) => option.value === this.selectedValue()),
  );

  protected readonly displayValue = computed(() => this.selectedOption()?.label ?? this.placeholder() ?? '');

  protected readonly hasSelection = computed(() => Boolean(this.selectedOption()));

  protected readonly classes = computed(() =>
    [
      'select-field__select',
      'cursor-pointer disabled:cursor-not-allowed',
      `select-field__select--${this.size()}`,
      `select-field__select--${this.fill()}`,
      `select-field__select--${this.variant()}`,
      `select-field__select--${this.appearance()}`,
      this.error() ? 'select-field__select--error' : '',
    ].join(' '),
  );

  protected handleChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedValue.set(target.value);
    this.valueChange.emit(target.value);
  }

  protected openDialog(): void {
    if (!this.disabled()) {
      this.isDialogOpen.set(true);
    }
  }

  protected closeDialog(): void {
    this.isDialogOpen.set(false);
  }

  protected selectOption(option: SelectOption): void {
    if (option.disabled) {
      return;
    }

    this.selectedValue.set(option.value);
    this.valueChange.emit(option.value);
    this.closeDialog();
  }
}
