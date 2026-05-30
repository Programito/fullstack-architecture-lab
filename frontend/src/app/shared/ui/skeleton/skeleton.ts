import { booleanAttribute, Component, computed, input } from '@angular/core';
import { NgStyle } from '@angular/common';

export type SkeletonAnimation = 'pulse' | 'wave' | 'none';
export type SkeletonAppearance = 'default' | 'minimal';
export type SkeletonShape = 'text' | 'block' | 'circle' | 'avatar' | 'rounded';
export type SkeletonTone = 'default' | 'subtle' | 'strong';

@Component({
  selector: 'app-skeleton',
  imports: [NgStyle],
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.css',
})
export class Skeleton {
  readonly shape = input<SkeletonShape>('block');
  readonly animation = input<SkeletonAnimation>('pulse');
  readonly appearance = input<SkeletonAppearance>('default');
  readonly tone = input<SkeletonTone>('default');
  readonly width = input('');
  readonly height = input('');
  readonly ariaLabel = input('Cargando');
  readonly decorative = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() =>
    [
      'skeleton',
      `skeleton--${this.shape()}`,
      `skeleton--${this.animation()}`,
      `skeleton--${this.tone()}`,
      `skeleton--${this.appearance()}`,
    ].join(' '),
  );

  protected readonly styles = computed(() => {
    const styles: Record<string, string> = {};

    if (this.width()) {
      styles['width'] = this.width();
    }

    if (this.height()) {
      styles['height'] = this.height();
    }

    return styles;
  });

  protected readonly role = computed(() => (this.decorative() ? null : 'status'));
  protected readonly label = computed(() => (this.decorative() ? null : this.ariaLabel()));
}
