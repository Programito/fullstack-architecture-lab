import { booleanAttribute, Component, ElementRef, HostListener, computed, input, model, output } from '@angular/core';
import { FloatingActionButton, type FloatingActionButtonSize, type FloatingActionButtonVariant } from '../floating-action-button/floating-action-button';
import { Icon } from '../icon/icon';
import { Tooltip } from '../tooltip/tooltip';

export type FloatingActionMenuPosition = 'inline' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type FloatingActionMenuDirection = 'up' | 'down' | 'left' | 'right';

export type FloatingActionMenuAction = {
  id: string;
  icon: string;
  label: string;
  disabled?: boolean;
  variant?: FloatingActionButtonVariant;
};

@Component({
  selector: 'app-floating-action-menu',
  imports: [FloatingActionButton, Icon, Tooltip],
  templateUrl: './floating-action-menu.html',
  styleUrl: './floating-action-menu.css',
})
export class FloatingActionMenu {
  readonly icon = input('add');
  readonly label = input('Crear');
  readonly ariaLabel = input('');
  readonly variant = input<FloatingActionButtonVariant>('primary');
  readonly size = input<FloatingActionButtonSize>('md');
  readonly position = input<FloatingActionMenuPosition>('inline');
  readonly direction = input<FloatingActionMenuDirection>('up');
  readonly actions = input<FloatingActionMenuAction[]>([]);
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly open = model(false);
  readonly actionPressed = output<FloatingActionMenuAction>();

  private readonly id = `floating-action-menu-${crypto.randomUUID()}`;
  protected readonly menuId = `${this.id}-menu`;

  protected readonly isOpen = computed(() => this.open() === true || `${this.open()}` === '');
  protected readonly accessibleName = computed(() => this.ariaLabel() || this.label());
  protected readonly iconSize = computed(() => (this.size() === 'lg' ? 'lg' : 'md'));
  protected readonly classes = computed(() =>
    [
      'floating-action-menu',
      `floating-action-menu--${this.size()}`,
      `floating-action-menu--${this.variant()}`,
      `floating-action-menu--${this.position()}`,
      `floating-action-menu--${this.direction()}`,
      this.isOpen() ? 'floating-action-menu--open' : '',
      this.disabled() ? 'floating-action-menu--disabled' : '',
    ].join(' '),
  );

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  @HostListener('document:pointerdown', ['$event'])
  protected handleDocumentPointerDown(event: PointerEvent): void {
    if (this.isOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  protected handleDocumentEscape(): void {
    this.close();
  }

  @HostListener('focusout', ['$event'])
  protected handleFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget as Node | null;

    if (this.isOpen() && nextTarget && !this.host.nativeElement.contains(nextTarget)) {
      this.close();
    }
  }

  protected toggle(): void {
    if (this.disabled()) {
      return;
    }

    this.open.set(!this.isOpen());
  }

  protected close(): void {
    if (this.isOpen()) {
      this.open.set(false);
    }
  }

  protected pressAction(action: FloatingActionMenuAction): void {
    if (this.disabled() || action.disabled) {
      return;
    }

    this.actionPressed.emit(action);
    this.close();
  }

  protected actionClasses(action: FloatingActionMenuAction, index: number): string {
    const variant = action.variant ?? this.variant();

    return [
      'floating-action-menu__action',
      `floating-action-menu__action--${variant}`,
      action.disabled ? 'floating-action-menu__action--disabled' : '',
      `floating-action-menu__action--index-${index}`,
    ].join(' ');
  }
}
