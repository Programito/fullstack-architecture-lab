import { booleanAttribute, Component, HostListener, computed, input, numberAttribute, output, signal } from '@angular/core';

export type PaginatorSize = 'sm' | 'md' | 'lg';
export type PaginatorVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type PaginatorAppearance = 'default' | 'minimal';

type PaginatorItem =
  | {
      type: 'page';
      key: string;
      page: number;
      label: string;
    }
  | {
      type: 'ellipsis';
      key: 'left-ellipsis' | 'right-ellipsis';
      label: string;
    };

@Component({
  selector: 'app-paginator',
  templateUrl: './paginator.html',
  styleUrl: './paginator.css',
})
export class Paginator {
  readonly ariaLabel = input('Paginacion');
  readonly page = input(1, { transform: normalizePositiveInteger });
  readonly totalItems = input(0, { transform: normalizeNonNegativeInteger });
  readonly pageSize = input(10, { transform: normalizePositiveInteger });
  readonly pageSizeOptions = input<number[]>([]);
  readonly siblingCount = input(1, { transform: normalizeNonNegativeInteger });
  readonly showEdges = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly size = input<PaginatorSize>('md');
  readonly variant = input<PaginatorVariant>('primary');
  readonly appearance = input<PaginatorAppearance>('default');

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly jumpTarget = signal<PaginatorItem['key'] | null>(null);
  protected readonly jumpValue = signal('');
  protected readonly jumpTouched = signal(false);

  protected readonly totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  protected readonly currentPage = computed(() => {
    const totalPages = this.totalPages();

    if (totalPages === 0) {
      return 0;
    }

    return clamp(this.page(), 1, totalPages);
  });

  protected readonly isDisabled = computed(() => this.disabled() || this.totalPages() === 0);
  protected readonly isFirstPage = computed(() => this.currentPage() <= 1);
  protected readonly isLastPage = computed(() => this.currentPage() >= this.totalPages());

  protected readonly summary = computed(() => {
    const totalItems = this.totalItems();

    if (totalItems === 0) {
      return '0 de 0';
    }

    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), totalItems);
    return `${start}-${end} de ${totalItems}`;
  });

  protected readonly mobileStatus = computed(() =>
    this.totalPages() === 0 ? 'Pagina 0 de 0' : `Pagina ${this.currentPage()} de ${this.totalPages()}`,
  );

  protected readonly normalizedPageSizeOptions = computed(() =>
    this.pageSizeOptions()
      .map((option) => normalizePositiveInteger(option))
      .filter((option, index, options) => options.indexOf(option) === index),
  );

  protected readonly hasPageSizeOptions = computed(() => this.normalizedPageSizeOptions().length > 0);

  protected readonly classes = computed(() =>
    [
      'paginator',
      `paginator--${this.size()}`,
      `paginator--${this.variant()}`,
      `paginator--${this.appearance()}`,
      this.isDisabled() ? 'paginator--disabled' : '',
    ].join(' '),
  );

  protected readonly pageItems = computed<PaginatorItem[]>(() => {
    const totalPages = this.totalPages();

    if (totalPages === 0) {
      return [];
    }

    const currentPage = this.currentPage();
    const siblingCount = this.siblingCount();
    const pages: PaginatorItem[] = [];
    const maxVisibleWithoutEllipsis = siblingCount * 2 + 5;

    if (totalPages <= maxVisibleWithoutEllipsis) {
      return range(1, totalPages).map(pageToItem);
    }

    let left = Math.max(2, currentPage - siblingCount);
    let right = Math.min(totalPages - 1, currentPage + siblingCount);

    if (left <= 3) {
      left = 2;
      right = Math.min(totalPages - 1, maxVisibleWithoutEllipsis - 2);
    }

    if (right >= totalPages - 2) {
      right = totalPages - 1;
      left = Math.max(2, totalPages - maxVisibleWithoutEllipsis + 3);
    }

    pages.push(pageToItem(1));

    if (left > 2) {
      pages.push({ type: 'ellipsis', key: 'left-ellipsis', label: 'Ir a pagina anterior oculta' });
    }

    range(left, right).forEach((page) => pages.push(pageToItem(page)));

    if (right < totalPages - 1) {
      pages.push({ type: 'ellipsis', key: 'right-ellipsis', label: 'Ir a pagina posterior oculta' });
    }

    pages.push(pageToItem(totalPages));

    return pages;
  });

  protected readonly jumpPage = computed(() => {
    const value = Number(this.jumpValue());
    return Number.isInteger(value) ? value : null;
  });

  protected readonly isJumpInvalid = computed(() => {
    if (!this.jumpTouched()) {
      return false;
    }

    const page = this.jumpPage();
    return page === null || page < 1 || page > this.totalPages();
  });

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    this.closeJump();
  }

  protected goToPage(page: number): void {
    if (this.isDisabled() || page === this.currentPage() || page < 1 || page > this.totalPages()) {
      return;
    }

    this.pageChange.emit(page);
  }

  protected previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  protected nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  protected openJump(target: PaginatorItem['key']): void {
    if (this.isDisabled()) {
      return;
    }

    this.jumpTarget.set(target);
    this.jumpValue.set(this.currentPage().toString());
    this.jumpTouched.set(false);
  }

  protected closeJump(): void {
    this.jumpTarget.set(null);
    this.jumpTouched.set(false);
  }

  protected updateJumpValue(event: Event): void {
    this.jumpValue.set((event.target as HTMLInputElement).value);
    this.jumpTouched.set(true);
  }

  protected submitJump(): void {
    this.jumpTouched.set(true);

    const page = this.jumpPage();

    if (page === null || page < 1 || page > this.totalPages()) {
      return;
    }

    this.goToPage(page);
    this.closeJump();
  }

  protected handlePageSizeChange(event: Event): void {
    const pageSize = normalizePositiveInteger((event.target as HTMLSelectElement).value);

    if (!this.disabled() && pageSize !== this.pageSize()) {
      this.pageSizeChange.emit(pageSize);
    }
  }
}

const normalizePositiveInteger = (value: unknown): number => {
  const number = numberAttribute(value);
  return Number.isInteger(number) && number > 0 ? number : 1;
};

const normalizeNonNegativeInteger = (value: unknown): number => {
  const number = numberAttribute(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const range = (start: number, end: number): number[] => {
  if (end < start) {
    return [];
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const pageToItem = (page: number): PaginatorItem => ({
  type: 'page',
  key: `page-${page}`,
  page,
  label: page.toString(),
});
