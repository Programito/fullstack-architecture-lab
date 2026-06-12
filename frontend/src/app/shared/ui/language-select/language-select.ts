import { booleanAttribute, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { LocaleService } from '../../i18n/locale.service';
import { LOCALE_OPTIONS, type AppLocale } from '../../i18n/locale.types';
import type { SelectFill, SelectSize, SelectVariant } from '../select/select';

export type LanguageSelectAppearance = 'default' | 'minimal';
export type LanguageSelectPlacement = 'bottom' | 'top';

@Component({
  selector: 'app-language-select',
  templateUrl: './language-select.html',
  styleUrl: './language-select.css',
})
export class LanguageSelect {
  private readonly localeService = inject(LocaleService);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  readonly label = input('');
  readonly name = input('locale');
  readonly hint = input('');
  readonly variant = input<SelectVariant>('neutral');
  readonly fill = input<SelectFill>('outline');
  readonly appearance = input<LanguageSelectAppearance>('default');
  readonly placement = input<LanguageSelectPlacement>('bottom');
  readonly size = input<SelectSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly showLabel = input(true, { transform: booleanAttribute });
  readonly showHint = input(true, { transform: booleanAttribute });

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

  protected readonly accessibleLabel = computed(() => this.label() || this.translate('languageSelect.label'));

  protected readonly displayedLabel = computed(() => (this.showLabel() ? this.accessibleLabel() : ''));

  protected readonly displayedHint = computed(() => (this.showHint() ? this.hint() || this.translate('languageSelect.hint') : ''));

  protected readonly describedBy = computed(() => (this.displayedHint() ? this.hintId : null));

  protected readonly buttonAriaLabel = computed(() =>
    this.translate('languageSelect.buttonAriaLabel', {
      label: this.accessibleLabel(),
      language: this.translate(this.selectedOption().labelKey),
    }),
  );

  protected readonly listboxAriaLabel = computed(() => this.translate('languageSelect.listboxAriaLabel'));

  protected readonly closeAriaLabel = computed(() => this.translate('languageSelect.closeAriaLabel'));

  protected readonly classes = computed(() =>
    [
      'language-select',
      `language-select--${this.size()}`,
      `language-select--${this.fill()}`,
      `language-select--${this.variant()}`,
      `language-select--${this.appearance()}`,
      `language-select--${this.placement()}`,
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

  protected getOptionLabel(locale: AppLocale, labelKey: string): string {
    return `${locale.toUpperCase()} ${this.translate(labelKey)}`;
  }

  protected getTranslatedLabel(labelKey: string): string {
    return this.translate(labelKey);
  }

  private translate(key: string, params?: Record<string, unknown>): string {
    this.activeLang();
    return this.transloco.translate(key, params);
  }
}
