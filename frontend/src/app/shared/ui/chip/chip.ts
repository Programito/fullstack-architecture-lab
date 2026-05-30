import { booleanAttribute, Component, computed, input, output } from '@angular/core';

export type ChipVariant = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'violet';
export type ChipSize = 'sm' | 'md';
export type ChipAppearance = 'default' | 'minimal';

@Component({
  selector: 'app-chip',
  templateUrl: './chip.html',
  styleUrl: './chip.css',
})
export class Chip {
  readonly variant = input<ChipVariant>('neutral');
  readonly appearance = input<ChipAppearance>('default');
  readonly size = input<ChipSize>('md');
  readonly selected = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly removable = input(false, { transform: booleanAttribute });

  readonly pressed = output<void>();
  readonly removed = output<void>();

  protected readonly classes = computed(() =>
    [
      'chip inline-flex w-fit items-center overflow-hidden rounded-full border font-medium transition',
      `chip--${this.appearance()}`,
      this.sizeClasses[this.size()],
      this.appearanceClass(),
    ].join(' '),
  );

  protected readonly actionClasses = computed(() =>
    [
      'chip__action min-w-0 border-0 bg-transparent p-0 text-inherit',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-55',
      this.actionAppearanceClass(),
    ].join(' '),
  );

  protected readonly removeClasses = computed(() =>
    [
      'chip__remove inline-flex items-center justify-center border-0 bg-transparent text-inherit transition',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-55',
      this.removeSizeClasses[this.size()],
      this.removeAppearanceClass(),
    ].join(' '),
  );

  private readonly sizeClasses: Record<ChipSize, string> = {
    sm: 'gap-1 px-2 py-1 text-xs',
    md: 'gap-1.5 px-3 py-1.5 text-sm',
  };

  private readonly removeSizeClasses: Record<ChipSize, string> = {
    sm: 'h-4 w-4 text-xs',
    md: 'h-5 w-5 text-sm',
  };

  private readonly idleClasses: Record<ChipVariant, string> = {
    primary: 'border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 focus-visible:outline-cyan-300',
    neutral: 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 focus-visible:outline-zinc-300',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 focus-visible:outline-emerald-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 focus-visible:outline-amber-300',
    danger: 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100 focus-visible:outline-red-300',
    violet: 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 focus-visible:outline-violet-300',
  };

  private readonly selectedClasses: Record<ChipVariant, string> = {
    primary: 'border-cyan-600 bg-cyan-600 text-white focus-visible:outline-cyan-300',
    neutral: 'border-zinc-900 bg-zinc-900 text-white focus-visible:outline-zinc-400',
    success: 'border-emerald-600 bg-emerald-600 text-white focus-visible:outline-emerald-300',
    warning: 'border-amber-400 bg-amber-400 text-zinc-950 focus-visible:outline-amber-300',
    danger: 'border-red-600 bg-red-600 text-white focus-visible:outline-red-300',
    violet: 'border-violet-600 bg-violet-600 text-white focus-visible:outline-violet-300',
  };

  private appearanceClass(): string {
    return this.selected() ? this.selectedClasses[this.variant()] : this.idleClasses[this.variant()];
  }

  private actionAppearanceClass(): string {
    return this.selected() ? 'focus-visible:outline-white' : 'focus-visible:outline-current';
  }

  private removeAppearanceClass(): string {
    return this.selected()
      ? 'text-current hover:bg-white/20 focus-visible:outline-white'
      : 'text-current hover:bg-black/10 focus-visible:outline-current';
  }

  protected handlePress(): void {
    if (!this.disabled()) {
      this.pressed.emit();
    }
  }

  protected handleRemove(event: Event): void {
    event.stopPropagation();

    if (!this.disabled()) {
      this.removed.emit();
    }
  }
}
