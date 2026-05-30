import { Component, computed, input } from '@angular/core';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';
export type CardAppearance = 'default' | 'minimal';

@Component({
  selector: 'app-card',
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class Card {
  readonly variant = input<CardVariant>('default');
  readonly padding = input<CardPadding>('md');
  readonly appearance = input<CardAppearance>('default');

  protected readonly classes = computed(() =>
    ['card', `card--${this.variant()}`, `card--padding-${this.padding()}`, `card--${this.appearance()}`].join(' '),
  );
}
