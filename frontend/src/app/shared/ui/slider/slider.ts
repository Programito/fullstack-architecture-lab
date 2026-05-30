import { booleanAttribute, Component, computed, input, output } from '@angular/core';

export type SliderValue = string | number;
export type SliderOption = {
  label: string;
  value: SliderValue;
  disabled?: boolean;
};
export type SliderSize = 'sm' | 'md' | 'lg';
export type SliderVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type SliderAppearance = 'default' | 'minimal';

@Component({
  selector: 'app-slider',
  templateUrl: './slider.html',
  styleUrl: './slider.css',
  host: {
    '[attr.id]': 'null',
  },
})
export class Slider {
  readonly id = input<string | null>(null);
  readonly label = input('');
  readonly hint = input('');
  readonly error = input('');
  readonly name = input('');
  readonly options = input<SliderOption[]>([]);
  readonly value = input<SliderValue>('');
  readonly variant = input<SliderVariant>('primary');
  readonly appearance = input<SliderAppearance>('default');
  readonly size = input<SliderSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly showValue = input(true, { transform: booleanAttribute });
  readonly showMarks = input(true, { transform: booleanAttribute });

  readonly valueChange = output<SliderValue>();

  private readonly generatedSliderId = `slider-${crypto.randomUUID()}`;

  protected readonly sliderId = computed(() => this.id() ?? this.generatedSliderId);
  protected readonly hintId = computed(() => `${this.sliderId()}-hint`);
  protected readonly errorId = computed(() => `${this.sliderId()}-error`);
  protected readonly maxIndex = computed(() => Math.max(this.options().length - 1, 0));
  protected readonly hasOptions = computed(() => this.options().length > 0);

  protected readonly selectedIndex = computed(() => {
    const index = this.options().findIndex((option) => option.value === this.value());
    return index >= 0 ? index : 0;
  });

  protected readonly selectedOption = computed(() => this.options()[this.selectedIndex()] ?? null);

  protected readonly selectedLabel = computed(() => this.selectedOption()?.label ?? '');

  protected readonly selectedValue = computed(() => {
    const option = this.selectedOption();
    return option ? String(option.value) : '';
  });

  protected readonly describedBy = computed(() => {
    const ids = [];

    if (this.hint()) {
      ids.push(this.hintId());
    }

    if (this.error()) {
      ids.push(this.errorId());
    }

    return ids.length > 0 ? ids.join(' ') : null;
  });

  protected readonly fieldClasses = computed(() =>
    [
      'slider-field',
      `slider-field--${this.size()}`,
      `slider-field--${this.variant()}`,
      `slider-field--${this.appearance()}`,
      this.error() ? 'slider-field--error' : '',
      this.disabled() ? 'slider-field--disabled' : '',
    ].join(' '),
  );

  protected readonly sliderStyle = computed(() => {
    const percent = this.maxIndex() > 0 ? (this.selectedIndex() / this.maxIndex()) * 100 : 0;
    return `--slider-progress: ${percent}%; --slider-mark-count: ${Math.max(this.options().length, 1)};`;
  });

  protected markClasses(index: number): string {
    return [
      'slider-field__mark',
      index === 0 ? 'slider-field__mark--first' : '',
      index === this.maxIndex() ? 'slider-field__mark--last' : '',
      index === this.selectedIndex() ? 'slider-field__mark--active' : '',
    ].join(' ');
  }

  protected markStyle(index: number): string {
    const percent = this.maxIndex() > 0 ? (index / this.maxIndex()) * 100 : 0;
    return `--slider-mark-position: ${percent}%;`;
  }

  protected handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const option = this.options()[Number(target.value)];

    if (option) {
      this.valueChange.emit(option.value);
    }
  }
}
