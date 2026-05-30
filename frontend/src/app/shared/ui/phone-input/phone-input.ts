import { booleanAttribute, Component, computed, effect, input, model, signal } from '@angular/core';
import {
  AsYouType,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
  type PhoneNumber,
} from 'libphonenumber-js/max';
import { Icon } from '../icon/icon';

export type PhoneInputFill = 'default' | 'solid' | 'outline' | 'filled';
export type PhoneInputAppearance = 'default' | 'minimal';
export type PhoneInputSize = 'sm' | 'md' | 'lg';
export type PhoneInputVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type PhoneCountryCode = CountryCode;

export type PhoneCountryOption = {
  code: PhoneCountryCode;
  label: string;
};

type PhoneCountryView = PhoneCountryOption & {
  callingCode: string;
  flag: string;
  ariaLabel: string;
};

const MOBILE_TYPES = new Set(['MOBILE', 'FIXED_LINE_OR_MOBILE']);

export const DEFAULT_PHONE_COUNTRIES: PhoneCountryOption[] = [
  { code: 'ES', label: 'Espana' },
  { code: 'PT', label: 'Portugal' },
  { code: 'FR', label: 'Francia' },
  { code: 'IT', label: 'Italia' },
  { code: 'DE', label: 'Alemania' },
  { code: 'GB', label: 'Reino Unido' },
  { code: 'US', label: 'Estados Unidos' },
  { code: 'MX', label: 'Mexico' },
  { code: 'AR', label: 'Argentina' },
  { code: 'CO', label: 'Colombia' },
  { code: 'CL', label: 'Chile' },
  { code: 'PE', label: 'Peru' },
];

@Component({
  selector: 'app-phone-input',
  imports: [Icon],
  templateUrl: './phone-input.html',
  styleUrl: './phone-input.css',
  host: {
    '[attr.id]': 'null',
    '(keydown.escape)': 'closeCountryMenu()',
  },
})
export class PhoneInput {
  readonly id = input<string | null>(null);
  readonly label = input('');
  readonly placeholder = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly name = input('');
  readonly variant = input<PhoneInputVariant>('primary');
  readonly fill = input<PhoneInputFill>('default');
  readonly appearance = input<PhoneInputAppearance>('default');
  readonly size = input<PhoneInputSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly mobileOnly = input(true, { transform: booleanAttribute });
  readonly countries = input<PhoneCountryOption[]>(DEFAULT_PHONE_COUNTRIES);

  readonly value = model('');
  readonly country = model<PhoneCountryCode>('ES');

  private readonly generatedInputId = `phone-input-${crypto.randomUUID()}`;

  protected readonly inputId = computed(() => this.id() ?? this.generatedInputId);
  protected readonly listboxId = computed(() => `${this.inputId()}-countries`);
  protected readonly hintId = computed(() => `${this.inputId()}-hint`);
  protected readonly errorId = computed(() => `${this.inputId()}-error`);
  protected readonly inputValue = signal('');
  protected readonly isCountryMenuOpen = signal(false);

  constructor() {
    effect(() => {
      this.inputValue.set(formatValueForCountry(this.value(), this.selectedCountry().code));
    });
  }

  protected readonly countryOptions = computed<PhoneCountryView[]>(() => {
    const uniqueCodes = new Set<PhoneCountryCode>();

    return this.countries().reduce<PhoneCountryView[]>((options, option) => {
      if (!isSupportedCountry(option.code) || uniqueCodes.has(option.code)) {
        return options;
      }

      uniqueCodes.add(option.code);

      options.push({
        ...option,
        callingCode: getCountryCallingCode(option.code),
        flag: getFlagEmoji(option.code),
        ariaLabel: `${option.label} +${getCountryCallingCode(option.code)}`,
      });

      return options;
    }, []);
  });

  protected readonly selectedCountry = computed<PhoneCountryView>(() => {
    const options = this.countryOptions();
    const fallback = options[0] ?? toCountryView(DEFAULT_PHONE_COUNTRIES[0]);

    return options.find((option) => option.code === this.country()) ?? fallback;
  });

  protected readonly selectedPhoneNumber = computed(() =>
    parsePhoneNumberFromString(this.value(), this.selectedCountry().code),
  );

  protected readonly isValid = computed(() => {
    const value = this.value();

    if (!value) {
      return !this.required();
    }

    const phoneNumber = this.selectedPhoneNumber();

    if (!phoneNumber?.isValid()) {
      return false;
    }

    return !this.mobileOnly() || isMobileNumber(phoneNumber);
  });

  protected readonly describedBy = computed(() => {
    if (this.error()) {
      return this.errorId();
    }

    return this.hint() ? this.hintId() : null;
  });

  protected readonly effectivePlaceholder = computed(() => this.placeholder() || '612 345 678');

  protected readonly fieldClasses = computed(() =>
    [
      'phone-input',
      `phone-input--${this.size()}`,
      `phone-input--${this.fill()}`,
      `phone-input--${this.appearance()}`,
      `phone-input--${this.variant()}`,
      this.error() ? 'phone-input--error' : '',
      this.disabled() ? 'phone-input--disabled' : '',
      this.readonly() ? 'phone-input--readonly' : '',
      this.isCountryMenuOpen() ? 'phone-input--open' : '',
    ].join(' '),
  );

  protected openCountryMenu(): void {
    if (!this.disabled() && !this.readonly()) {
      this.isCountryMenuOpen.set(true);
    }
  }

  protected closeCountryMenu(): void {
    this.isCountryMenuOpen.set(false);
  }

  protected toggleCountryMenu(): void {
    if (this.disabled() || this.readonly()) {
      return;
    }

    this.isCountryMenuOpen.update((isOpen) => !isOpen);
  }

  protected selectCountry(option: PhoneCountryView): void {
    if (this.disabled() || this.readonly()) {
      return;
    }

    const nationalNumber = getNationalDraft(this.inputValue(), this.selectedCountry().code);
    this.country.set(option.code);
    this.commitInputValue(nationalNumber, option.code);
    this.closeCountryMenu();
  }

  protected handleInput(event: Event): void {
    if (this.disabled() || this.readonly()) {
      return;
    }

    const target = event.target as HTMLInputElement;
    this.commitInputValue(target.value, this.selectedCountry().code);
  }

  protected handleBlur(): void {
    this.inputValue.set(formatValueForCountry(this.value(), this.selectedCountry().code));
  }

  private commitInputValue(rawValue: string, country: PhoneCountryCode): void {
    const trimmedValue = rawValue.trim();

    if (!trimmedValue) {
      this.inputValue.set('');
      this.value.set('');
      return;
    }

    const formattedValue = new AsYouType(country).input(trimmedValue);
    const parsedValue = parsePhoneNumberFromString(formattedValue, country);

    this.inputValue.set(formattedValue);
    this.value.set(parsedValue?.number ?? '');
  }
}

function toCountryView(option: PhoneCountryOption): PhoneCountryView {
  return {
    ...option,
    callingCode: getCountryCallingCode(option.code),
    flag: getFlagEmoji(option.code),
    ariaLabel: `${option.label} +${getCountryCallingCode(option.code)}`,
  };
}

function getFlagEmoji(country: PhoneCountryCode): string {
  return String.fromCodePoint(...country.split('').map((letter) => 127397 + letter.charCodeAt(0)));
}

function formatValueForCountry(value: string, country: PhoneCountryCode): string {
  if (!value) {
    return '';
  }

  const phoneNumber = parsePhoneNumberFromString(value, country);

  if (phoneNumber) {
    return phoneNumber.country === country ? phoneNumber.formatNational() : phoneNumber.formatInternational();
  }

  return new AsYouType(country).input(value);
}

function getNationalDraft(value: string, country: PhoneCountryCode): string {
  const phoneNumber = parsePhoneNumberFromString(value, country);

  return phoneNumber?.nationalNumber ?? value;
}

function isMobileNumber(phoneNumber: PhoneNumber): boolean {
  const type = phoneNumber.getType();

  return type ? MOBILE_TYPES.has(type) : true;
}
