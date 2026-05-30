import { Component, computed, input, signal } from '@angular/core';

export type AvatarShape = 'circle' | 'square';
export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarVariant = 'neutral' | 'primary' | 'violet';
export type AvatarAppearance = 'default' | 'minimal';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
})
export class Avatar {
  readonly src = input('');
  readonly alt = input('');
  readonly name = input('');
  readonly initials = input('');
  readonly size = input<AvatarSize>('md');
  readonly shape = input<AvatarShape>('circle');
  readonly variant = input<AvatarVariant>('neutral');
  readonly appearance = input<AvatarAppearance>('default');

  protected readonly imageFailed = signal(false);

  protected readonly classes = computed(() =>
    ['avatar', `avatar--${this.size()}`, `avatar--${this.shape()}`, `avatar--${this.variant()}`, `avatar--${this.appearance()}`].join(
      ' ',
    ),
  );

  protected readonly hasImage = computed(() => Boolean(this.src()) && !this.imageFailed());

  protected readonly displayInitials = computed(() => {
    const explicitInitials = this.initials().trim();

    if (explicitInitials) {
      return explicitInitials.slice(0, 3).toUpperCase();
    }

    return this.name()
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  });

  protected readonly accessibleLabel = computed(() => this.alt() || this.name() || 'Avatar');

  protected handleImageError(): void {
    this.imageFailed.set(true);
  }
}
