import { booleanAttribute, Component, computed, input, model, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { Tooltip } from '../tooltip/tooltip';

export type SideMenuSize = 'sm' | 'md' | 'lg';
export type SideMenuVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type SideMenuAppearance = 'default' | 'minimal';

export type SideMenuItem = {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  badge?: string;
  disabled?: boolean;
  children?: SideMenuItem[];
};

export type SideMenuGroup = {
  label?: string;
  items: SideMenuItem[];
};

@Component({
  selector: 'app-side-menu',
  imports: [Icon, Tooltip],
  templateUrl: './side-menu.html',
  styleUrl: './side-menu.css',
})
export class SideMenu {
  readonly groups = input<SideMenuGroup[]>([]);
  readonly ariaLabel = input('Navegacion lateral');
  readonly collapsible = input(true, { transform: booleanAttribute });
  readonly sticky = input(true, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly size = input<SideMenuSize>('md');
  readonly variant = input<SideMenuVariant>('primary');
  readonly appearance = input<SideMenuAppearance>('default');

  readonly collapsed = model(false);
  readonly activeId = model('');

  readonly itemSelected = output<SideMenuItem>();

  protected readonly classes = computed(() =>
    [
      'side-menu',
      `side-menu--${this.size()}`,
      `side-menu--${this.variant()}`,
      `side-menu--${this.appearance()}`,
      this.sticky() ? 'side-menu--sticky' : '',
      this.collapsed() ? 'side-menu--collapsed' : '',
      this.disabled() ? 'side-menu--disabled' : '',
    ].join(' '),
  );

  protected readonly collapseLabel = computed(() => (this.collapsed() ? 'Expandir menu' : 'Contraer menu'));
  protected readonly collapseIcon = computed(() => (this.collapsed() ? 'left_panel_open' : 'left_panel_close'));

  protected toggleCollapsed(): void {
    if (!this.disabled() && this.collapsible()) {
      this.collapsed.update((value) => !value);
    }
  }

  protected isActive(item: SideMenuItem): boolean {
    return item.id === this.activeId();
  }

  protected itemClasses(item: SideMenuItem): string {
    return [
      'side-menu__link',
      this.isActive(item) ? 'side-menu__link--active' : '',
      item.disabled ? 'side-menu__link--disabled' : '',
      item.children?.length ? 'side-menu__link--parent' : '',
    ].join(' ');
  }

  protected selectItem(item: SideMenuItem, event: Event): void {
    if (this.disabled() || item.disabled) {
      event.preventDefault();
      return;
    }

    this.activeId.set(item.id);
    this.itemSelected.emit(item);
  }
}
