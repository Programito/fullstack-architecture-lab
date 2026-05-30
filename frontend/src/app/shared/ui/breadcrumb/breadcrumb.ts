import { Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

export type BreadcrumbSize = 'sm' | 'md' | 'lg';

export type BreadcrumbItem = {
  label: string;
  href?: string;
  current?: boolean;
  disabled?: boolean;
};

@Component({
  selector: 'app-breadcrumb',
  imports: [Icon],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.css',
})
export class Breadcrumb {
  readonly items = input<BreadcrumbItem[]>([]);
  readonly ariaLabel = input('Miga de pan');
  readonly size = input<BreadcrumbSize>('md');

  readonly itemSelected = output<BreadcrumbItem>();

  protected readonly classes = computed(() => ['breadcrumb', `breadcrumb--${this.size()}`].join(' '));

  protected isCurrent(item: BreadcrumbItem, index: number): boolean {
    return item.current === true || index === this.items().length - 1;
  }

  protected selectItem(item: BreadcrumbItem, index: number, event: Event): void {
    if (item.disabled || this.isCurrent(item, index)) {
      event.preventDefault();
      return;
    }

    if (!item.href) {
      this.itemSelected.emit(item);
    }
  }
}
