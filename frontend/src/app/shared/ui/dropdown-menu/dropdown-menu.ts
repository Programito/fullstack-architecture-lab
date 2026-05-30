import { booleanAttribute, Component, ElementRef, HostListener, computed, input, model, output, signal } from '@angular/core';
import { Icon } from '../icon/icon';

export type DropdownMenuSize = 'sm' | 'md' | 'lg';
export type DropdownMenuVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type DropdownMenuAppearance = 'default' | 'minimal';
export type DropdownMenuPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

export type DropdownMenuItem = {
  label: string;
  value: string;
  icon?: string;
  description?: string;
  disabled?: boolean;
  danger?: boolean;
};

@Component({
  selector: 'app-dropdown-menu',
  imports: [Icon],
  templateUrl: './dropdown-menu.html',
  styleUrl: './dropdown-menu.css',
  host: {
    '[attr.id]': 'null',
  },
})
export class DropdownMenu {
  readonly items = input<DropdownMenuItem[]>([]);
  readonly label = input('Opciones');
  readonly ariaLabel = input('');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly size = input<DropdownMenuSize>('md');
  readonly variant = input<DropdownMenuVariant>('neutral');
  readonly appearance = input<DropdownMenuAppearance>('default');
  readonly placement = input<DropdownMenuPlacement>('bottom-end');

  readonly open = model(false);
  readonly selected = output<string>();

  private readonly id = `dropdown-menu-${crypto.randomUUID()}`;
  protected readonly menuId = `${this.id}-menu`;
  protected readonly activeIndex = signal(-1);

  protected readonly triggerLabel = computed(() => this.ariaLabel() || this.label());
  protected readonly enabledItems = computed(() => this.items().filter((item) => !item.disabled));
  protected readonly hasItems = computed(() => this.items().length > 0);

  protected readonly classes = computed(() =>
    [
      'dropdown-menu',
      `dropdown-menu--${this.size()}`,
      `dropdown-menu--${this.variant()}`,
      `dropdown-menu--${this.appearance()}`,
      `dropdown-menu--${this.placement()}`,
      this.open() ? 'dropdown-menu--open' : '',
      this.disabled() ? 'dropdown-menu--disabled' : '',
    ].join(' '),
  );

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  @HostListener('document:pointerdown', ['$event'])
  protected handleDocumentPointerDown(event: PointerEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  protected handleDocumentEscape(): void {
    this.close();
  }

  protected toggle(): void {
    if (this.disabled()) {
      return;
    }

    this.setOpen(!this.open());
  }

  protected close(): void {
    this.setOpen(false);
  }

  protected selectItem(item: DropdownMenuItem): void {
    if (this.disabled() || item.disabled) {
      return;
    }

    this.selected.emit(item.value);
    this.close();
  }

  protected handleTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.setOpen(true);
      this.setActiveToFirstEnabled();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.setOpen(true);
      this.setActiveToLastEnabled();
    }
  }

  protected handleMenuKeydown(event: KeyboardEvent): void {
    if (!this.open()) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveActive(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.setActiveToFirstEnabled();
    } else if (event.key === 'End') {
      event.preventDefault();
      this.setActiveToLastEnabled();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const item = this.items()[this.activeIndex()];

      if (item) {
        this.selectItem(item);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  protected setActive(index: number): void {
    if (!this.items()[index]?.disabled) {
      this.activeIndex.set(index);
    }
  }

  protected itemClasses(item: DropdownMenuItem): string {
    return [
      'dropdown-menu__item',
      item.icon ? '' : 'dropdown-menu__item--no-icon',
      item.danger ? 'dropdown-menu__item--danger' : '',
    ].join(' ');
  }

  protected itemId(index: number): string {
    return `${this.id}-item-${index}`;
  }

  protected activeDescendant(): string | null {
    const index = this.activeIndex();
    return index >= 0 ? this.itemId(index) : null;
  }

  private setOpen(open: boolean): void {
    if (this.open() === open) {
      return;
    }

    this.open.set(open);

    if (!open) {
      this.activeIndex.set(-1);
    } else {
      this.setActiveToFirstEnabled();
    }
  }

  private moveActive(delta: number): void {
    const items = this.items();

    if (items.length === 0) {
      this.activeIndex.set(-1);
      return;
    }

    let next = this.activeIndex();

    for (let attempt = 0; attempt < items.length; attempt += 1) {
      next = (next + delta + items.length) % items.length;

      if (!items[next].disabled) {
        this.activeIndex.set(next);
        return;
      }
    }
  }

  private setActiveToFirstEnabled(): void {
    this.activeIndex.set(this.items().findIndex((item) => !item.disabled));
  }

  private setActiveToLastEnabled(): void {
    const items = this.items();

    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (!items[index].disabled) {
        this.activeIndex.set(index);
        return;
      }
    }

    this.activeIndex.set(-1);
  }
}
