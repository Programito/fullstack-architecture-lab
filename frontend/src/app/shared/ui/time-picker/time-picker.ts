import { booleanAttribute, Component, HostListener, computed, effect, input, numberAttribute, output, signal } from '@angular/core';

export type TimePickerFill = 'default' | 'solid' | 'outline' | 'filled';
export type TimePickerAppearance = 'default' | 'minimal';
export type TimePickerSize = 'sm' | 'md' | 'lg';
export type TimePickerVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';

type TimeOption = {
  value: number;
  label: string;
  classes: string;
  disabled: boolean;
};

@Component({
  selector: 'app-time-picker',
  templateUrl: './time-picker.html',
  styleUrl: './time-picker.css',
  host: {
    '[attr.id]': 'null',
  },
})
export class TimePicker {
  readonly id = input<string | null>(null);
  readonly label = input('');
  readonly placeholder = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly value = input('');
  readonly name = input('');
  readonly min = input('');
  readonly max = input('');
  readonly minuteStep = input(15, { transform: normalizeMinuteStep });
  readonly variant = input<TimePickerVariant>('primary');
  readonly fill = input<TimePickerFill>('default');
  readonly appearance = input<TimePickerAppearance>('default');
  readonly size = input<TimePickerSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });

  readonly valueChange = output<string>();

  private readonly generatedPickerId = `time-picker-${crypto.randomUUID()}`;

  protected readonly pickerId = computed(() => this.id() ?? this.generatedPickerId);
  protected readonly hintId = computed(() => `${this.pickerId()}-hint`);
  protected readonly errorId = computed(() => `${this.pickerId()}-error`);
  protected readonly selectedValue = signal('');
  protected readonly inputValue = signal('');
  protected readonly draftHour = signal(0);
  protected readonly draftMinute = signal(0);
  protected readonly isOpen = signal(false);

  constructor() {
    effect(() => {
      const value = normalizeTime(this.value());
      this.selectedValue.set(value);
      this.inputValue.set(value);
      this.setDraftFromValue(value);
    });
  }

  protected readonly fieldClasses = computed(() =>
    [
      'time-picker',
      `time-picker--${this.size()}`,
      `time-picker--${this.fill()}`,
      `time-picker--${this.appearance()}`,
      `time-picker--${this.variant()}`,
      this.error() ? 'time-picker--error' : '',
      this.isOpen() ? 'time-picker--open' : '',
    ].join(' '),
  );

  protected readonly describedBy = computed(() => {
    if (this.error()) {
      return this.errorId();
    }

    return this.hint() ? this.hintId() : null;
  });

  protected readonly effectivePlaceholder = computed(() => this.placeholder() || 'Selecciona hora');

  protected readonly hourOptions = computed<TimeOption[]>(() => {
    const draftHour = this.draftHour();

    return Array.from({ length: 24 }, (_, hour) => {
      const disabled = !this.hasAvailableMinute(hour);

      return {
        value: hour,
        label: hour.toString().padStart(2, '0'),
        classes: ['time-picker__option', draftHour === hour ? 'time-picker__option--selected' : '']
          .filter(Boolean)
          .join(' '),
        disabled,
      };
    });
  });

  protected readonly minuteOptions = computed<TimeOption[]>(() => {
    const step = this.minuteStep();
    const draftHour = this.draftHour();
    const draftMinute = this.draftMinute();

    return Array.from({ length: Math.ceil(60 / step) }, (_, index) => {
      const minute = index * step;

      return {
        value: minute,
        label: minute.toString().padStart(2, '0'),
        classes: ['time-picker__option', draftMinute === minute ? 'time-picker__option--selected' : '']
          .filter(Boolean)
          .join(' '),
        disabled: !this.isAllowedTime(draftHour, minute),
      };
    });
  });

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    this.close();
  }

  protected open(): void {
    if (this.disabled()) {
      return;
    }

    this.setDraftFromValue(this.selectedValue());
    this.isOpen.set(true);
  }

  protected toggle(): void {
    if (this.disabled()) {
      return;
    }

    if (this.isOpen()) {
      this.close();
      return;
    }

    this.open();
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.inputValue.set(value);

    if (!value.trim()) {
      this.commitValue('');
      return;
    }

    const normalizedValue = parseTime(value);

    if (normalizedValue && this.isAllowedValue(normalizedValue)) {
      this.commitValue(normalizedValue, false);
    }
  }

  protected handleBlur(): void {
    const normalizedValue = parseTime(this.inputValue());

    if (!this.inputValue().trim()) {
      this.commitValue('');
      return;
    }

    if (normalizedValue && this.isAllowedValue(normalizedValue)) {
      this.commitValue(normalizedValue);
      return;
    }

    this.inputValue.set(this.selectedValue());
  }

  protected handleEnter(): void {
    this.handleBlur();
    this.close();
  }

  protected selectHour(option: TimeOption): void {
    if (option.disabled) {
      return;
    }

    const hour = option.value;
    const minute = this.isAllowedTime(hour, this.draftMinute()) ? this.draftMinute() : this.firstAvailableMinute(hour);

    if (minute === null) {
      return;
    }

    this.draftHour.set(hour);
    this.draftMinute.set(minute);
    this.commitValue(formatTime(hour, minute));
  }

  protected selectMinute(option: TimeOption): void {
    if (option.disabled) {
      return;
    }

    this.draftMinute.set(option.value);
    this.commitValue(formatTime(this.draftHour(), option.value));
  }

  private commitValue(value: string, syncInput = true): void {
    this.selectedValue.set(value);

    if (syncInput) {
      this.inputValue.set(value);
    }

    this.setDraftFromValue(value);
    this.valueChange.emit(value);
  }

  private setDraftFromValue(value: string): void {
    const totalMinutes = toMinutes(value) ?? toMinutes(normalizeTime(this.min())) ?? 0;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    this.draftHour.set(hour);
    this.draftMinute.set(minute);
  }

  private hasAvailableMinute(hour: number): boolean {
    return Array.from({ length: 60 }, (_, minute) => minute).some((minute) => this.isAllowedTime(hour, minute));
  }

  private firstAvailableMinute(hour: number): number | null {
    return Array.from({ length: 60 }, (_, minute) => minute).find((minute) => this.isAllowedTime(hour, minute)) ?? null;
  }

  private isAllowedValue(value: string): boolean {
    const totalMinutes = toMinutes(value);

    return totalMinutes !== null && this.isAllowedTotalMinutes(totalMinutes);
  }

  private isAllowedTime(hour: number, minute: number): boolean {
    return this.isAllowedTotalMinutes(hour * 60 + minute);
  }

  private isAllowedTotalMinutes(totalMinutes: number): boolean {
    const min = toMinutes(normalizeTime(this.min()));
    const max = toMinutes(normalizeTime(this.max()));

    return !((min !== null && totalMinutes < min) || (max !== null && totalMinutes > max));
  }
}

const normalizeMinuteStep = (value: unknown): number => {
  const step = numberAttribute(value);

  if (!Number.isInteger(step) || step < 1 || step > 60) {
    return 15;
  }

  return step;
};

const normalizeTime = (value: string): string => (/^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '');

const parseTime = (value: string): string => {
  const trimmedValue = value.trim();
  const match = trimmedValue.match(/^([01]?\d|2[0-3]):?([0-5]\d)$/);

  if (!match) {
    return '';
  }

  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

const toMinutes = (value: string): number | null => {
  if (!value) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatTime = (hours: number, minutes: number): string =>
  `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
