import { booleanAttribute, Component, computed, input, output } from '@angular/core';

export type SegmentedControlSize = 'sm' | 'md' | 'lg';
export type SegmentedControlVariant = 'underline' | 'pill';
export type SegmentedControlAppearance = 'default' | 'minimal';
export type SegmentedControlOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

@Component({
  selector: 'app-segmented-control',
  templateUrl: './segmented-control.html',
  styleUrl: './segmented-control.css',
})
export class SegmentedControl {
  readonly ariaLabel = input('Seleccionar opcion');
  readonly options = input<SegmentedControlOption[]>([]);
  readonly value = input('');
  readonly variant = input<SegmentedControlVariant>('pill');
  readonly appearance = input<SegmentedControlAppearance>('default');
  readonly size = input<SegmentedControlSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly valueChange = output<string>();

  protected readonly selectedIndex = computed(() => {
    const index = this.options().findIndex((option) => option.value === this.selectedValue());
    return index >= 0 ? index : 0;
  });

  protected readonly selectedValue = computed(() => this.value() || this.options()[0]?.value || '');

  protected readonly classes = computed(() =>
    [
      'segmented-control',
      `segmented-control--${this.variant()}`,
      `segmented-control--${this.size()}`,
      `segmented-control--${this.appearance()}`,
    ].join(' '),
  );

  protected readonly indicatorStyle = computed(() => {
    const count = Math.max(this.options().length, 1);
    const index = Math.min(this.selectedIndex(), count - 1);

    return `--segment-count: ${count}; --segment-index: ${index};`;
  });

  protected optionClasses(option: SegmentedControlOption): string {
    return [
      'segmented-control__item cursor-pointer disabled:cursor-not-allowed',
      option.value === this.selectedValue() ? 'segmented-control__item--active' : '',
    ].join(' ');
  }

  protected select(option: SegmentedControlOption): void {
    if (!this.disabled() && !option.disabled && option.value !== this.selectedValue()) {
      this.valueChange.emit(option.value);
    }
  }
}
