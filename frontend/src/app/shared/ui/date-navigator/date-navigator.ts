import { booleanAttribute, Component, computed, inject, input, output } from '@angular/core';
import { LocaleService } from '../../i18n/locale.service';
import type { AppLocale } from '../../i18n/locale.types';
import { DatePicker } from '../date-picker/date-picker';

const DATE_FORMATS: Record<AppLocale, string> = {
  es: "EEEE, d 'de' MMMM",
  ca: "EEEE, d 'de' MMMM",
  en: 'EEEE, MMMM d',
};

@Component({
  selector: 'app-date-navigator',
  templateUrl: './date-navigator.html',
  styleUrl: './date-navigator.css',
  imports: [DatePicker],
})
export class DateNavigator {
  private readonly localeService = inject(LocaleService);

  readonly value = input<string>('');
  readonly valueChange = output<string>();
  readonly showToday = input(true, { transform: booleanAttribute });
  readonly prevLabel = input('Día anterior');
  readonly nextLabel = input('Día siguiente');
  readonly todayLabel = input('Hoy');

  protected readonly pickerDateFormat = computed(() => DATE_FORMATS[this.localeService.locale()]);
  protected readonly isToday = computed(() => this.value() === todayIso());

  protected navigate(days: number): void {
    const base = this.value() || todayIso();
    const d = parseLocalDate(base);
    d.setDate(d.getDate() + days);
    this.valueChange.emit(formatIsoDate(d));
  }

  protected goToToday(): void {
    this.valueChange.emit(todayIso());
  }
}

const formatIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseLocalDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

const todayIso = (): string => formatIsoDate(new Date());
