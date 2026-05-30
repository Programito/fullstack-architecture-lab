import { booleanAttribute, Component, computed, inject, input, signal } from '@angular/core';
import { LocaleService } from '../../i18n/locale.service';
import { LOCALE_OPTIONS, type AppLocale } from '../../i18n/locale.types';
import type { SelectFill, SelectSize, SelectVariant } from '../select/select';

export type LanguageSelectAppearance = 'default' | 'minimal';

@Component({
  selector: 'app-language-select',
  templateUrl: './language-select.html',
  styleUrl: './language-select.css',
})
export class LanguageSelect {
  private readonly localeService = inject(LocaleService);

  readonly label = input('Idioma');
  readonly name = input('locale');
  readonly hint = input('');
  readonly variant = input<SelectVariant>('neutral');
  readonly fill = input<SelectFill>('outline');
  readonly appearance = input<LanguageSelectAppearance>('default');
  readonly size = input<SelectSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly value = this.localeService.locale;
  protected readonly options = computed(() => LOCALE_OPTIONS);
  protected readonly isOpen = signal(false);
  protected readonly selectId = `language-select-${crypto.randomUUID()}`;
  protected readonly labelId = `${this.selectId}-label`;
  protected readonly hintId = `${this.selectId}-hint`;
  protected readonly listboxId = `${this.selectId}-listbox`;

  protected readonly selectedOption = computed(
    () => this.options().find((option) => option.value === this.value()) ?? this.options()[0],
  );

  protected readonly selectedCode = computed(() => this.value().toUpperCase());

  protected readonly describedBy = computed(() => (this.hint() ? this.hintId : null));

  protected readonly buttonAriaLabel = computed(() => `${this.label()}: ${this.selectedOption().label}`);

  protected readonly classes = computed(() =>
    [
      'language-select',
      `language-select--${this.size()}`,
      `language-select--${this.fill()}`,
      `language-select--${this.variant()}`,
      `language-select--${this.appearance()}`,
      this.isOpen() ? 'language-select--open' : '',
    ].join(' '),
  );

  protected toggleMenu(): void {
    if (!this.disabled()) {
      this.isOpen.update((isOpen) => !isOpen);
    }
  }

  protected closeMenu(): void {
    this.isOpen.set(false);
  }

  protected selectLocale(locale: AppLocale): void {
    this.localeService.setLocale(locale);
    this.closeMenu();
  }

  protected getOptionLabel(locale: AppLocale, label: string): string {
    return `${locale.toUpperCase()} ${label}`;
  }
}
