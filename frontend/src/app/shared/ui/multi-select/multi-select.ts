import { booleanAttribute, Component, computed, input, model, signal } from '@angular/core';
import { FormField, type FormFieldSize } from '../form-field/form-field';
import { Icon } from '../icon/icon';

export type MultiSelectFill = 'default' | 'solid' | 'outline' | 'filled';
export type MultiSelectAppearance = 'default' | 'minimal';
export type MultiSelectSize = FormFieldSize;
export type MultiSelectVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';

export type MultiSelectOption = {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
};

@Component({
  selector: 'app-multi-select',
  imports: [FormField, Icon],
  templateUrl: './multi-select.html',
  styleUrl: './multi-select.css',
  host: {
    '[attr.id]': 'null',
    '(keydown.escape)': 'close()',
  },
})
export class MultiSelect {
  readonly label = input('');
  readonly placeholder = input('Selecciona opciones');
  readonly hint = input('');
  readonly error = input('');
  readonly emptyText = input('Sin resultados');
  readonly options = input<MultiSelectOption[]>([]);
  readonly maxSelected = input<number | null>(null);
  readonly variant = input<MultiSelectVariant>('primary');
  readonly fill = input<MultiSelectFill>('default');
  readonly appearance = input<MultiSelectAppearance>('default');
  readonly size = input<MultiSelectSize>('md');
  readonly clearable = input(true, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });

  readonly value = model<string[]>([]);
  readonly query = model('');

  private readonly generatedId = `multi-select-${crypto.randomUUID()}`;

  protected readonly inputId = this.generatedId;
  protected readonly listboxId = `${this.inputId}-listbox`;
  protected readonly isOpen = signal(false);

  protected readonly selectedOptions = computed(() =>
    this.value()
      .map((value) => this.options().find((option) => option.value === value))
      .filter((option): option is MultiSelectOption => Boolean(option)),
  );

  protected readonly filteredOptions = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();

    if (!query) {
      return this.options();
    }

    return this.options().filter((option) =>
      `${option.label} ${option.value} ${option.description ?? ''}`.toLocaleLowerCase().includes(query),
    );
  });

  protected readonly describedBy = computed(() => {
    if (this.error()) {
      return `${this.inputId}-error`;
    }

    return this.hint() ? `${this.inputId}-hint` : null;
  });

  protected readonly classes = computed(() =>
    [
      'multi-select',
      `multi-select--${this.size()}`,
      `multi-select--${this.fill()}`,
      `multi-select--${this.appearance()}`,
      `multi-select--${this.variant()}`,
      this.error() ? 'multi-select--error' : '',
      this.disabled() ? 'multi-select--disabled' : '',
      this.isOpen() ? 'multi-select--open' : '',
    ].join(' '),
  );

  protected readonly canClear = computed(() => this.clearable() && !this.disabled() && this.value().length > 0);

  protected open(): void {
    if (!this.disabled()) {
      this.isOpen.set(true);
    }
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected handleInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.open();
  }

  protected toggleOption(option: MultiSelectOption): void {
    if (this.isOptionDisabled(option)) {
      return;
    }

    if (this.isSelected(option.value)) {
      this.value.set(this.value().filter((value) => value !== option.value));
      return;
    }

    this.value.set([...this.value(), option.value]);
    this.query.set('');
  }

  protected removeOption(option: MultiSelectOption, event: Event): void {
    event.stopPropagation();
    this.value.set(this.value().filter((value) => value !== option.value));
  }

  protected clear(event: Event): void {
    event.stopPropagation();
    this.value.set([]);
    this.query.set('');
  }

  protected isSelected(value: string): boolean {
    return this.value().includes(value);
  }

  protected isOptionDisabled(option: MultiSelectOption): boolean {
    const maxSelected = this.maxSelected();

    return Boolean(option.disabled || (maxSelected !== null && this.value().length >= maxSelected && !this.isSelected(option.value)));
  }
}
