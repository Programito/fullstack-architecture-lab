import { booleanAttribute, Component, computed, input, output } from '@angular/core';

export type SearchInputSize = 'sm' | 'md' | 'lg';
export type SearchInputVariant = 'primary' | 'neutral' | 'violet';
export type SearchInputAppearance = 'default' | 'minimal';

@Component({
  selector: 'app-search-input',
  templateUrl: './search-input.html',
  styleUrl: './search-input.css',
})
export class SearchInput {
  readonly label = input('');
  readonly placeholder = input('Buscar');
  readonly hint = input('');
  readonly value = input('');
  readonly name = input('');
  readonly size = input<SearchInputSize>('md');
  readonly variant = input<SearchInputVariant>('primary');
  readonly appearance = input<SearchInputAppearance>('default');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly clearable = input(true, { transform: booleanAttribute });
  readonly clearAriaLabel = input('Limpiar busqueda');

  readonly valueChange = output<string>();
  readonly searched = output<string>();
  readonly cleared = output<void>();

  protected readonly inputId = `search-input-${crypto.randomUUID()}`;
  protected readonly hintId = `${this.inputId}-hint`;
  protected readonly showClear = computed(() => this.clearable() && this.value().length > 0 && !this.disabled());
  protected readonly describedBy = computed(() => (this.hint() ? this.hintId : null));
  protected readonly classes = computed(() =>
    [
      'search-input__control',
      `search-input__control--${this.size()}`,
      `search-input__control--${this.variant()}`,
      `search-input__control--${this.appearance()}`,
    ].join(' '),
  );

  protected handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    this.valueChange.emit(value);
  }

  protected handleSearch(event: Event): void {
    event.preventDefault();
    this.searched.emit(this.value());
  }

  protected clear(): void {
    this.valueChange.emit('');
    this.cleared.emit();
  }
}
