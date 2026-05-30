import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { booleanAttribute, Component, computed, input, model, output } from '@angular/core';
import { Icon } from '../icon/icon';

export type ReorderListSize = 'sm' | 'md' | 'lg';
export type ReorderListVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type ReorderListAppearance = 'default' | 'minimal';

export type ReorderListItem = {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
};

export type ReorderListEvent = {
  value: ReorderListItem[];
  previousIndex: number;
  currentIndex: number;
  item: ReorderListItem;
};

@Component({
  selector: 'app-reorder-list',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, Icon],
  templateUrl: './reorder-list.html',
  styleUrl: './reorder-list.css',
  host: {
    '[attr.id]': 'null',
  },
})
export class ReorderList {
  readonly label = input('');
  readonly hint = input('');
  readonly emptyText = input('Sin elementos');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly dragEnabled = input(true, { transform: booleanAttribute });
  readonly showControls = input(true, { transform: booleanAttribute });
  readonly variant = input<ReorderListVariant>('primary');
  readonly appearance = input<ReorderListAppearance>('default');
  readonly size = input<ReorderListSize>('md');

  readonly value = model<ReorderListItem[]>([]);
  readonly reordered = output<ReorderListEvent>();

  private readonly generatedId = `reorder-list-${crypto.randomUUID()}`;

  protected readonly listId = this.generatedId;
  protected readonly hintId = `${this.generatedId}-hint`;
  protected readonly isLocked = computed(() => this.disabled() || this.readonly());
  protected readonly isEmpty = computed(() => this.value().length === 0);
  protected readonly describedBy = computed(() => (this.hint() ? this.hintId : null));

  protected readonly classes = computed(() =>
    [
      'reorder-list',
      `reorder-list--${this.size()}`,
      `reorder-list--${this.variant()}`,
      `reorder-list--${this.appearance()}`,
      this.disabled() ? 'reorder-list--disabled' : '',
      this.readonly() ? 'reorder-list--readonly' : '',
    ].join(' '),
  );

  protected readonly isDragDisabled = computed(() => this.isLocked() || !this.dragEnabled());

  protected itemClasses(item: ReorderListItem): string {
    return ['reorder-list__item', item.disabled ? 'reorder-list__item--disabled' : ''].join(' ');
  }

  protected canMoveUp(index: number): boolean {
    return this.canMove(index, index - 1);
  }

  protected canMoveDown(index: number): boolean {
    return this.canMove(index, index + 1);
  }

  protected moveUp(index: number): void {
    this.reorder(index, index - 1);
  }

  protected moveDown(index: number): void {
    this.reorder(index, index + 1);
  }

  protected handleDrop(event: CdkDragDrop<ReorderListItem[]>): void {
    this.reorder(event.previousIndex, event.currentIndex);
  }

  protected trackById(_index: number, item: ReorderListItem): string {
    return item.id;
  }

  private reorder(previousIndex: number, currentIndex: number): void {
    if (!this.canMove(previousIndex, currentIndex)) {
      return;
    }

    const nextValue = [...this.value()];
    const item = nextValue[previousIndex];
    moveItemInArray(nextValue, previousIndex, currentIndex);
    this.value.set(nextValue);
    this.reordered.emit({ value: nextValue, previousIndex, currentIndex, item });
  }

  private canMove(previousIndex: number, currentIndex: number): boolean {
    const items = this.value();

    if (
      this.isLocked() ||
      previousIndex === currentIndex ||
      previousIndex < 0 ||
      currentIndex < 0 ||
      previousIndex >= items.length ||
      currentIndex >= items.length ||
      items[previousIndex].disabled
    ) {
      return false;
    }

    const start = Math.min(previousIndex, currentIndex);
    const end = Math.max(previousIndex, currentIndex);
    return !items.slice(start, end + 1).some((item, index) => index + start !== previousIndex && item.disabled);
  }
}
