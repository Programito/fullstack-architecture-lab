import { booleanAttribute, Component, computed, input, numberAttribute } from '@angular/core';

export type ProgressSize = 'sm' | 'md' | 'lg';
export type ProgressVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type ProgressAppearance = 'default' | 'minimal';

@Component({
  selector: 'app-progress',
  templateUrl: './progress.html',
  styleUrl: './progress.css',
})
export class Progress {
  readonly value = input(0, { transform: normalizeNumber });
  readonly max = input(100, { transform: normalizeMax });
  readonly label = input('');
  readonly showValue = input(false, { transform: booleanAttribute });
  readonly indeterminate = input(false, { transform: booleanAttribute });
  readonly variant = input<ProgressVariant>('primary');
  readonly size = input<ProgressSize>('md');
  readonly appearance = input<ProgressAppearance>('default');

  protected readonly normalizedValue = computed(() => clamp(this.value(), 0, this.max()));
  protected readonly percent = computed(() => Math.round((this.normalizedValue() / this.max()) * 100));
  protected readonly barStyle = computed(() => (this.indeterminate() ? null : `width: ${this.percent()}%;`));
  protected readonly valueText = computed(() => `${this.percent()}%`);
  protected readonly classes = computed(() =>
    ['progress', `progress--${this.size()}`, `progress--${this.variant()}`, `progress--${this.appearance()}`, this.indeterminate() ? 'progress--indeterminate' : ''].join(' '),
  );
}

const normalizeNumber = (value: unknown): number => {
  const number = numberAttribute(value);
  return Number.isFinite(number) ? number : 0;
};

const normalizeMax = (value: unknown): number => {
  const number = numberAttribute(value);
  return Number.isFinite(number) && number > 0 ? number : 100;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
