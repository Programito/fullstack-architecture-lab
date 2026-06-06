import { booleanAttribute, Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type ButtonFill = 'default' | 'solid' | 'outline' | 'clear' | 'gradient';
export type ButtonExpand = 'default' | 'block' | 'full';
export type ButtonShape = 'default' | 'round';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';
export type ButtonAppearance = 'default' | 'minimal';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly fill = input<ButtonFill>('default');
  readonly appearance = input<ButtonAppearance>('default');
  readonly expand = input<ButtonExpand>('default');
  readonly shape = input<ButtonShape>('default');
  readonly size = input<ButtonSize>('md');
  readonly type = input<ButtonType>('button');
  readonly ariaLabel = input('');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });

  readonly pressed = output<void>();

  protected readonly classes = computed(() =>
    [
      'inline-flex items-center justify-center gap-2 border font-medium transition',
      `button--${this.appearance()}`,
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
      'disabled:pointer-events-none disabled:opacity-55',
      this.radiusClass(),
      this.sizeClasses[this.size()],
      this.expandClasses[this.expand()],
      this.appearanceClass(),
    ].join(' '),
  );

  private readonly sizeClasses: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-base',
  };

  private readonly expandClasses: Record<ButtonExpand, string> = {
    default: 'w-auto',
    block: 'w-full',
    full: 'w-full',
  };

  private readonly appearanceClasses: Record<ButtonVariant, Record<Exclude<ButtonFill, 'default'>, string>> = {
    primary: {
      solid: 'border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-500 focus-visible:outline-cyan-300',
      outline: 'button--primary-outline',
      clear: 'button--primary-clear',
      gradient: 'button--gradient',
    },
    secondary: {
      solid: 'border-zinc-700 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 focus-visible:outline-zinc-400',
      outline: 'button--secondary-outline',
      clear: 'button--secondary-clear',
      gradient: 'button--gradient',
    },
    neutral: {
      solid: 'button--neutral-solid',
      outline: 'button--neutral-outline',
      clear: 'button--neutral-clear',
      gradient: 'button--gradient',
    },
    danger: {
      solid: 'border-red-600 bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-300',
      outline: 'button--danger-outline',
      clear: 'button--danger-clear',
      gradient: 'button--gradient',
    },
    violet: {
      solid: 'border-violet-600 bg-violet-600 text-white hover:bg-violet-500 focus-visible:outline-violet-300',
      outline: 'button--violet-outline',
      clear: 'button--violet-clear',
      gradient: 'button--gradient',
    },
  };

  private appearanceClass(): string {
    const currentFill = this.fill();
    const fill: Exclude<ButtonFill, 'default'> = currentFill === 'default' ? 'solid' : currentFill;

    return this.appearanceClasses[this.variant()][fill];
  }

  private radiusClass(): string {
    if (this.expand() === 'full') {
      return 'rounded-none';
    }

    return this.shape() === 'round' ? 'rounded-full' : 'rounded-md';
  }

  protected handleClick(): void {
    if (!this.disabled() && !this.loading()) {
      this.pressed.emit();
    }
  }
}
