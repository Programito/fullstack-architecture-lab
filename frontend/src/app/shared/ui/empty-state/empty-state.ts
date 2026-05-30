import { Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

export type EmptyStateSize = 'sm' | 'md' | 'lg';
export type EmptyStateAppearance = 'default' | 'minimal' | 'danger';

@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input('Sin datos');
  readonly description = input('');
  readonly actionLabel = input('');
  readonly secondaryActionLabel = input('');
  readonly size = input<EmptyStateSize>('md');
  readonly appearance = input<EmptyStateAppearance>('default');

  readonly action = output<void>();
  readonly secondaryAction = output<void>();

  protected readonly classes = computed(() => ['empty-state', `empty-state--${this.size()}`, `empty-state--${this.appearance()}`].join(' '));

  protected emitAction(): void {
    this.action.emit();
  }

  protected emitSecondaryAction(): void {
    this.secondaryAction.emit();
  }
}
