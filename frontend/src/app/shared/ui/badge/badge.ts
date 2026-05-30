import { Component, computed, input } from '@angular/core';

export type BadgeVariant = 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger' | 'violet';
export type BadgeFill = 'solid' | 'outline' | 'soft' | 'gradient';
export type BadgeSize = 'sm' | 'md';
export type BadgeShape = 'default' | 'round';
export type BadgeAppearance = 'default' | 'minimal';

@Component({
  selector: 'app-badge',
  templateUrl: './badge.html',
  styleUrl: './badge.css',
})
export class Badge {
  readonly variant = input<BadgeVariant>('neutral');
  readonly fill = input<BadgeFill>('soft');
  readonly size = input<BadgeSize>('md');
  readonly shape = input<BadgeShape>('round');
  readonly appearance = input<BadgeAppearance>('default');

  protected readonly classes = computed(() =>
    [
      'badge',
      `badge--${this.variant()}`,
      `badge--${this.fill()}`,
      `badge--${this.size()}`,
      `badge--${this.shape()}`,
      `badge--${this.appearance()}`,
    ].join(' '),
  );
}
