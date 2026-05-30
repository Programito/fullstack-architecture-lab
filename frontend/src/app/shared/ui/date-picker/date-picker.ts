import { booleanAttribute, Component, HostListener, computed, effect, inject, input, output, signal } from '@angular/core';
import {
  addMonths,
  compareAsc,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ca, enUS, es, type Locale } from 'date-fns/locale';
import { LocaleService } from '../../i18n/locale.service';
import type { AppLocale } from '../../i18n/locale.types';

export type DatePickerFill = 'default' | 'solid' | 'outline' | 'filled';
export type DatePickerAppearance = 'default' | 'minimal';
export type DatePickerMode = 'single' | 'range';
export type DatePickerSize = 'sm' | 'md' | 'lg';
export type DatePickerVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type DatePickerWeekStartsOn = 0 | 1;
type DatePickerView = 'days' | 'months';

export type DateRangeValue = {
  start: string;
  end: string;
};

type CalendarDay = {
  date: Date;
  iso: string;
  label: string;
  ariaLabel: string;
  classes: string;
  disabled: boolean;
};

type CalendarMonth = {
  index: number;
  label: string;
  ariaLabel: string;
  classes: string;
  disabled: boolean;
};

const DATE_FORMAT = 'yyyy-MM-dd';
const LOCALES: Record<AppLocale, Locale> = {
  es,
  en: enUS,
  ca,
};

@Component({
  selector: 'app-date-picker',
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.css',
})
export class DatePicker {
  private readonly localeService = inject(LocaleService);

  readonly mode = input<DatePickerMode>('single');
  readonly label = input('');
  readonly placeholder = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly value = input('');
  readonly startValue = input('');
  readonly endValue = input('');
  readonly dateFormat = input('d MMM yyyy');
  readonly weekStartsOn = input<DatePickerWeekStartsOn, unknown>(1, { transform: normalizeWeekStartsOn });
  readonly name = input('');
  readonly min = input('');
  readonly max = input('');
  readonly variant = input<DatePickerVariant>('primary');
  readonly fill = input<DatePickerFill>('default');
  readonly appearance = input<DatePickerAppearance>('default');
  readonly size = input<DatePickerSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });

  readonly valueChange = output<string>();
  readonly rangeChange = output<DateRangeValue>();

  protected readonly pickerId = `date-picker-${crypto.randomUUID()}`;
  protected readonly labelId = `${this.pickerId}-label`;
  protected readonly hintId = `${this.pickerId}-hint`;
  protected readonly errorId = `${this.pickerId}-error`;
  protected readonly gridId = `${this.pickerId}-grid`;
  protected readonly startName = computed(() => (this.name() ? `${this.name()}Start` : ''));
  protected readonly endName = computed(() => (this.name() ? `${this.name()}End` : ''));

  protected readonly isOpen = signal(false);
  protected readonly pickerView = signal<DatePickerView>('days');
  protected readonly viewDate = signal(startOfMonth(new Date()));
  protected readonly yearInputValue = signal(format(new Date(), 'yyyy'));
  protected readonly selectedValue = signal('');
  protected readonly selectedStart = signal('');
  protected readonly selectedEnd = signal('');
  protected readonly draftStart = signal('');
  protected readonly hoverValue = signal('');

  constructor() {
    effect(() => {
      const value = normalizeIsoDate(this.value());
      const start = normalizeIsoDate(this.startValue());
      const end = normalizeIsoDate(this.endValue());

      this.selectedValue.set(value);
      this.selectedStart.set(start);
      this.selectedEnd.set(end);

      const anchor = parseIsoDate(value || start || end);
      if (anchor) {
        this.viewDate.set(startOfMonth(anchor));
      }
    });

    effect(() => {
      this.yearInputValue.set(format(this.viewDate(), 'yyyy'));
    });
  }

  protected readonly currentLocale = computed(() => LOCALES[this.localeService.locale()]);

  protected readonly fieldClasses = computed(() =>
    [
      'date-picker',
      `date-picker--${this.mode()}`,
      `date-picker--${this.size()}`,
      `date-picker--${this.fill()}`,
      `date-picker--${this.appearance()}`,
      `date-picker--${this.variant()}`,
      this.error() ? 'date-picker--error' : '',
      this.isOpen() ? 'date-picker--open' : '',
    ].join(' '),
  );

  protected readonly describedBy = computed(() => {
    if (this.error()) {
      return this.errorId;
    }

    return this.hint() ? this.hintId : null;
  });

  protected readonly displayValue = computed(() => {
    if (this.mode() === 'range') {
      const start = parseIsoDate(this.selectedStart());
      const end = parseIsoDate(this.selectedEnd());

      if (start && end) {
        return `${this.formatDisplayDate(start)} - ${this.formatDisplayDate(end)}`;
      }

      if (start) {
        return `${this.formatDisplayDate(start)} -`;
      }

      return '';
    }

    const value = parseIsoDate(this.selectedValue());
    return value ? this.formatDisplayDate(value) : '';
  });

  protected readonly effectivePlaceholder = computed(() => {
    if (this.placeholder()) {
      return this.placeholder();
    }

    return this.mode() === 'range' ? 'Selecciona periodo' : 'Selecciona fecha';
  });

  protected readonly monthLabel = computed(() => capitalize(format(this.viewDate(), 'LLLL yyyy', { locale: this.currentLocale() })));

  protected readonly monthPickerLabel = computed(() => format(this.viewDate(), 'yyyy'));

  protected readonly calendarMonths = computed<CalendarMonth[]>(() => {
    const viewDate = this.viewDate();

    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(viewDate.getFullYear(), index, 1);
      const disabled = this.isDisabledMonth(date);

      return {
        index,
        label: capitalize(format(date, 'LLL', { locale: this.currentLocale() })),
        ariaLabel: capitalize(format(date, 'LLLL yyyy', { locale: this.currentLocale() })),
        classes: ['date-picker__month-option', isSameMonth(date, viewDate) ? 'date-picker__month-option--active' : '']
          .filter(Boolean)
          .join(' '),
        disabled,
      };
    });
  });

  protected readonly weekDays = computed(() => {
    const start = startOfWeek(this.viewDate(), { weekStartsOn: this.weekStartsOn() });

    return Array.from({ length: 7 }, (_, index) =>
      capitalize(format(addDaysLocal(start, index), 'EEE', { locale: this.currentLocale() })),
    );
  });

  protected readonly calendarDays = computed<CalendarDay[]>(() => {
    const viewDate = this.viewDate();
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: this.weekStartsOn() });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: this.weekStartsOn() });

    return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => {
      const iso = toIsoDate(date);
      const disabled = this.isDisabledDate(date);

      return {
        date,
        iso,
        label: format(date, 'd', { locale: this.currentLocale() }),
        ariaLabel: format(date, 'PPP', { locale: this.currentLocale() }),
        classes: this.dayClasses(date, disabled),
        disabled,
      };
    });
  });

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    this.close();
  }

  protected open(): void {
    if (!this.disabled()) {
      this.isOpen.set(true);
    }
  }

  protected close(): void {
    this.isOpen.set(false);
    this.pickerView.set('days');
    this.draftStart.set('');
    this.hoverValue.set('');
  }

  protected toggle(): void {
    if (this.isOpen()) {
      this.close();
      return;
    }

    this.open();
  }

  protected previousMonth(): void {
    this.viewDate.set(this.pickerView() === 'months' ? addYearsLocal(this.viewDate(), -1) : subMonths(this.viewDate(), 1));
  }

  protected nextMonth(): void {
    this.viewDate.set(this.pickerView() === 'months' ? addYearsLocal(this.viewDate(), 1) : addMonths(this.viewDate(), 1));
  }

  protected showMonthPicker(): void {
    this.pickerView.set('months');
  }

  protected showDayPicker(): void {
    this.pickerView.set('days');
  }

  protected updateYearInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.yearInputValue.set(value);

    if (/^\d{4}$/.test(value)) {
      this.commitYear();
    }
  }

  protected commitYear(): void {
    const year = Number(this.yearInputValue());

    if (!Number.isInteger(year) || year < 1 || year > 9999) {
      this.yearInputValue.set(format(this.viewDate(), 'yyyy'));
      return;
    }

    this.viewDate.set(startOfMonth(new Date(year, this.viewDate().getMonth(), 1)));
  }

  protected selectMonth(month: CalendarMonth): void {
    if (month.disabled) {
      return;
    }

    this.commitYear();
    const year = this.viewDate().getFullYear();
    const nextViewDate = startOfMonth(new Date(year, month.index, 1));

    if (this.mode() === 'single') {
      const selectedDate = parseIsoDate(this.selectedValue());
      const nextSelectedDate = selectedDate ? copyDayIntoMonth(selectedDate, nextViewDate) : null;

      if (nextSelectedDate && !this.isDisabledDate(nextSelectedDate)) {
        const nextValue = toIsoDate(nextSelectedDate);
        this.selectedValue.set(nextValue);
        this.valueChange.emit(nextValue);
        this.viewDate.set(startOfMonth(nextSelectedDate));
        this.showDayPicker();
        return;
      }
    }

    this.viewDate.set(nextViewDate);
    this.showDayPicker();
  }

  protected selectDay(day: CalendarDay): void {
    if (day.disabled) {
      return;
    }

    if (this.mode() === 'single') {
      this.selectedValue.set(day.iso);
      this.valueChange.emit(day.iso);
      this.close();
      return;
    }

    const draftStart = this.draftStart();

    if (!draftStart) {
      this.draftStart.set(day.iso);
      this.selectedStart.set(day.iso);
      this.selectedEnd.set('');
      this.rangeChange.emit({ start: day.iso, end: '' });
      return;
    }

    const range = sortRange(draftStart, day.iso);
    this.selectedStart.set(range.start);
    this.selectedEnd.set(range.end);
    this.rangeChange.emit(range);
    this.close();
  }

  protected setHover(day: CalendarDay): void {
    if (!day.disabled && this.mode() === 'range') {
      this.hoverValue.set(day.iso);
    }
  }

  protected clearHover(): void {
    this.hoverValue.set('');
  }

  private dayClasses(date: Date, disabled: boolean): string {
    const iso = toIsoDate(date);
    const classes = ['date-picker__day'];

    if (!isSameMonth(date, this.viewDate())) {
      classes.push('date-picker__day--outside');
    }

    if (isSameDay(date, new Date())) {
      classes.push('date-picker__day--today');
    }

    if (disabled) {
      classes.push('date-picker__day--disabled');
    }

    if (this.mode() === 'single') {
      if (iso === this.selectedValue()) {
        classes.push('date-picker__day--selected');
      }

      return classes.join(' ');
    }

    const range = this.visibleRange();

    if (range && isDateBetween(date, range.startDate, range.endDate)) {
      classes.push('date-picker__day--in-range');
    }

    if (range && iso === range.start) {
      classes.push('date-picker__day--range-start');
    }

    if (range && iso === range.end) {
      classes.push('date-picker__day--range-end');
    }

    if (this.draftStart() && iso === this.draftStart()) {
      classes.push('date-picker__day--range-start');
    }

    return classes.join(' ');
  }

  private visibleRange(): (DateRangeValue & { startDate: Date; endDate: Date }) | null {
    const selectedStart = this.selectedStart();
    const selectedEnd = this.selectedEnd();

    if (selectedStart && selectedEnd) {
      const range = sortRange(selectedStart, selectedEnd);
      return toRangeWithDates(range);
    }

    const draftStart = this.draftStart();
    const hoverValue = this.hoverValue();

    if (draftStart && hoverValue) {
      const range = sortRange(draftStart, hoverValue);
      return toRangeWithDates(range);
    }

    return null;
  }

  private isDisabledDate(date: Date): boolean {
    const min = parseIsoDate(this.min());
    const max = parseIsoDate(this.max());

    return Boolean((min && isBefore(date, min)) || (max && isAfter(date, max)));
  }

  private isDisabledMonth(date: Date): boolean {
    const min = parseIsoDate(this.min());
    const max = parseIsoDate(this.max());
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    return Boolean((min && isBefore(monthEnd, min)) || (max && isAfter(monthStart, max)));
  }

  private formatDisplayDate(date: Date): string {
    return format(date, this.dateFormat(), { locale: this.currentLocale() });
  }
}

const normalizeIsoDate = (value: string): string => (parseIsoDate(value) ? value : '');

const parseIsoDate = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = parseISO(value);
  return isValid(date) ? date : null;
};

const toIsoDate = (date: Date): string => format(date, DATE_FORMAT);

const normalizeWeekStartsOn = (value: unknown): DatePickerWeekStartsOn => (Number(value) === 0 ? 0 : 1);

const sortRange = (first: string, second: string): DateRangeValue => {
  const firstDate = parseIsoDate(first);
  const secondDate = parseIsoDate(second);

  if (!firstDate || !secondDate) {
    return { start: first, end: second };
  }

  return compareAsc(firstDate, secondDate) <= 0 ? { start: first, end: second } : { start: second, end: first };
};

const toRangeWithDates = (range: DateRangeValue): (DateRangeValue & { startDate: Date; endDate: Date }) | null => {
  const startDate = parseIsoDate(range.start);
  const endDate = parseIsoDate(range.end);

  return startDate && endDate ? { ...range, startDate, endDate } : null;
};

const isDateBetween = (date: Date, startDate: Date, endDate: Date): boolean =>
  compareAsc(date, startDate) >= 0 && compareAsc(date, endDate) <= 0;

const addDaysLocal = (date: Date, amount: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const addYearsLocal = (date: Date, amount: number): Date => new Date(date.getFullYear() + amount, date.getMonth(), 1);

const copyDayIntoMonth = (source: Date, monthDate: Date): Date => {
  const lastDayOfMonth = endOfMonth(monthDate).getDate();
  return new Date(monthDate.getFullYear(), monthDate.getMonth(), Math.min(source.getDate(), lastDayOfMonth));
};

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);
