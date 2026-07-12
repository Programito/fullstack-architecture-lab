import { booleanAttribute, Component, computed, effect, input, model, signal } from '@angular/core';
import { FormField, type FormFieldSize } from '../form-field/form-field';
import { Icon } from '../icon/icon';

export type ComboboxFill = 'default' | 'solid' | 'outline' | 'filled';
export type ComboboxAppearance = 'default' | 'minimal';
export type ComboboxSize = FormFieldSize;
export type ComboboxVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';

export type ComboboxOption = {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
};

@Component({
  selector: 'app-combobox',
  imports: [FormField, Icon],
  templateUrl: './combobox.html',
  styleUrl: './combobox.css',
  host: {
    '[attr.id]': 'null',
    '(keydown.escape)': 'close()',
  },
})
export class Combobox {
  readonly label = input('');
  readonly placeholder = input('Selecciona una opcion');
  readonly hint = input('');
  readonly error = input('');
  readonly emptyText = input('Sin resultados');
  readonly options = input<ComboboxOption[]>([]);
  readonly variant = input<ComboboxVariant>('primary');
  readonly fill = input<ComboboxFill>('default');
  readonly appearance = input<ComboboxAppearance>('default');
  readonly size = input<ComboboxSize>('md');
  readonly clearable = input(true, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });

  readonly value = model('');
  readonly query = model('');

  private readonly generatedId = `combobox-${crypto.randomUUID()}`;

  protected readonly inputId = this.generatedId;
  protected readonly listboxId = `${this.inputId}-listbox`;
  protected readonly isOpen = signal(false);
  protected readonly activeIndex = signal(-1);

  constructor() {
    effect(() => {
      const selected = this.selectedOption();
      const query = this.query();

      if (selected && query !== selected.label) {
        this.query.set(selected.label);
        return;
      }

      // When parent state clears the selected value, also clear the visible label.
      if (!this.value() && query && this.options().some((option) => option.label === query)) {
        this.query.set('');
      }
    });
  }

  protected readonly selectedOption = computed(() => this.options().find((option) => option.value === this.value()));

  protected readonly filteredOptions = computed(() => {
    const query = normalize(this.query());

    if (!query || this.selectedOption()?.label === this.query()) {
      return this.options();
    }

    return this.options().filter((option) =>
      normalize(`${option.label} ${option.value} ${option.description ?? ''}`).includes(query),
    );
  });

  protected readonly describedBy = computed(() => {
    if (this.error()) {
      return `${this.inputId}-error`;
    }

    return this.hint() ? `${this.inputId}-hint` : null;
  });

  protected readonly activeDescendant = computed(() => {
    const index = this.activeIndex();

    return index >= 0 ? `${this.inputId}-option-${index}` : null;
  });

  protected readonly classes = computed(() =>
    [
      'combobox',
      `combobox--${this.size()}`,
      `combobox--${this.fill()}`,
      `combobox--${this.appearance()}`,
      `combobox--${this.variant()}`,
      this.error() ? 'combobox--error' : '',
      this.disabled() ? 'combobox--disabled' : '',
      this.isOpen() ? 'combobox--open' : '',
    ].join(' '),
  );

  protected readonly canClear = computed(() => this.clearable() && !this.disabled() && Boolean(this.value() || this.query()));

  protected open(): void {
    if (!this.disabled()) {
      this.isOpen.set(true);
      this.setActiveToFirstEnabled();
    }
  }

  protected close(): void {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  protected handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.query.set(target.value);
    this.value.set('');
    this.isOpen.set(true);
    this.setActiveToFirstEnabled();
  }

  protected selectOption(option: ComboboxOption): void {
    if (option.disabled) {
      return;
    }

    this.value.set(option.value);
    this.query.set(option.label);
    this.close();
  }

  protected clear(event: Event): void {
    event.stopPropagation();
    this.value.set('');
    this.query.set('');
    this.close();
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveActive(-1);
    } else if (event.key === 'Enter' && this.isOpen()) {
      event.preventDefault();
      const option = this.filteredOptions()[this.activeIndex()];

      if (option) {
        this.selectOption(option);
      }
    }
  }

  private moveActive(delta: number): void {
    const options = this.filteredOptions();

    if (!this.isOpen()) {
      this.isOpen.set(true);
    }

    if (options.length === 0) {
      this.activeIndex.set(-1);
      return;
    }

    let next = this.activeIndex();

    for (let attempt = 0; attempt < options.length; attempt += 1) {
      next = (next + delta + options.length) % options.length;

      if (!options[next].disabled) {
        this.activeIndex.set(next);
        return;
      }
    }
  }

  private setActiveToFirstEnabled(): void {
    this.activeIndex.set(this.filteredOptions().findIndex((option) => !option.disabled));
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}
