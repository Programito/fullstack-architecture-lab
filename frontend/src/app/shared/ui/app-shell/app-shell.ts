import { booleanAttribute, Component, computed, input, model, output, signal } from '@angular/core';
import { Icon } from '../icon/icon';
import { Navbar, type NavbarAppearance, type NavbarSize, type NavbarVariant } from '../navbar/navbar';
import { SideMenu, type SideMenuGroup, type SideMenuItem } from '../side-menu/side-menu';

export type AppShellSize = NavbarSize;
export type AppShellVariant = NavbarVariant;
export type AppShellAppearance = NavbarAppearance;

@Component({
  selector: 'app-app-shell',
  imports: [Icon, Navbar, SideMenu],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  readonly brand = input('');
  readonly brandHref = input('');
  readonly menuGroups = input<SideMenuGroup[]>([]);
  readonly activeId = input('');
  readonly menuSticky = input(true, { transform: booleanAttribute });
  readonly size = input<AppShellSize>('md');
  readonly variant = input<AppShellVariant>('primary');
  readonly appearance = input<AppShellAppearance>('default');

  readonly menuCollapsed = model(false);

  readonly menuItemSelected = output<SideMenuItem>();
  readonly brandSelected = output<void>();

  protected readonly mobileMenuOpen = signal(false);
  protected readonly classes = computed(() =>
    [
      'app-shell',
      `app-shell--${this.size()}`,
      `app-shell--${this.variant()}`,
      `app-shell--${this.appearance()}`,
      this.menuCollapsed() ? 'app-shell--menu-collapsed' : '',
      this.mobileMenuOpen() ? 'app-shell--menu-open' : '',
    ].join(' '),
  );

  protected openMobileMenu(): void {
    this.mobileMenuOpen.set(true);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  protected handleMenuItemSelected(item: SideMenuItem): void {
    this.menuItemSelected.emit(item);
    this.closeMobileMenu();
  }

  protected handleBrandSelected(): void {
    this.brandSelected.emit();
  }
}
