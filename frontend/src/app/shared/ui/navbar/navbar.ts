import { booleanAttribute, Component, computed, input, output } from '@angular/core';

export type NavbarSize = 'sm' | 'md' | 'lg';
export type NavbarVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type NavbarAppearance = 'default' | 'minimal';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  readonly brand = input('');
  readonly brandHref = input('');
  readonly ariaLabel = input('Navegacion principal');
  readonly size = input<NavbarSize>('md');
  readonly variant = input<NavbarVariant>('primary');
  readonly appearance = input<NavbarAppearance>('default');
  readonly sticky = input(false, { transform: booleanAttribute });

  readonly brandSelected = output<void>();

  protected readonly classes = computed(() =>
    [
      'navbar',
      `navbar--${this.size()}`,
      `navbar--${this.variant()}`,
      `navbar--${this.appearance()}`,
      this.sticky() ? 'navbar--sticky' : '',
    ].join(' '),
  );

  protected selectBrand(): void {
    this.brandSelected.emit();
  }
}
