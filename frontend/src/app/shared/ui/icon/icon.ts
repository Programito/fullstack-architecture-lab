import { booleanAttribute, Component, computed, input } from '@angular/core';

export type IconSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.css',
})
export class Icon {
  readonly name = input('');
  readonly size = input<IconSize>('md');
  readonly fill = input(false, { transform: booleanAttribute });
  readonly decorative = input(true, { transform: booleanAttribute });
  readonly ariaLabel = input('');

  protected readonly classes = computed(() =>
    [
      'icon',
      'material-symbols-rounded',
      `icon--${this.size()}`,
      this.fill() ? 'icon--filled' : '',
    ].join(' '),
  );

  protected readonly role = computed(() => (this.decorative() ? null : 'img'));
  protected readonly hidden = computed(() => (this.decorative() ? true : null));
  protected readonly label = computed(() => (this.decorative() ? null : this.ariaLabel() || this.name()));
}
