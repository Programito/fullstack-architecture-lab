import { booleanAttribute, Component, computed, input, output } from '@angular/core';

export type TabsSize = 'sm' | 'md' | 'lg';
export type TabsVariant = 'underline' | 'pill';
export type TabsAppearance = 'default' | 'minimal';
export type TabsOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

let nextTabsId = 0;

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.html',
  styleUrl: './tabs.css',
})
export class Tabs {
  readonly ariaLabel = input('Seleccionar pestana');
  readonly options = input<TabsOption[]>([]);
  readonly value = input('');
  readonly variant = input<TabsVariant>('underline');
  readonly appearance = input<TabsAppearance>('default');
  readonly size = input<TabsSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly valueChange = output<string>();

  private readonly id = nextTabsId++;

  protected readonly selectedValue = computed(() => {
    const options = this.options();
    const active = options.find((option) => option.value === this.value() && !option.disabled);
    return active?.value ?? options.find((option) => !option.disabled)?.value ?? '';
  });

  protected readonly selectedIndex = computed(() => {
    const index = this.options().findIndex((option) => option.value === this.selectedValue());
    return index >= 0 ? index : 0;
  });

  protected readonly tablistClasses = computed(() =>
    ['tabs__list', `tabs__list--${this.variant()}`, `tabs__list--${this.size()}`, `tabs__list--${this.appearance()}`].join(
      ' ',
    ),
  );

  protected readonly indicatorStyle = computed(() => {
    const count = Math.max(this.options().length, 1);
    const index = Math.min(this.selectedIndex(), count - 1);

    return `--tabs-count: ${count}; --tabs-index: ${index};`;
  });

  protected tabId(value: string): string {
    return `tabs-${this.id}-tab-${value}`;
  }

  protected panelId(): string {
    return `tabs-${this.id}-panel`;
  }

  protected tabClasses(option: TabsOption): string {
    return ['tabs__tab', option.value === this.selectedValue() ? 'tabs__tab--active' : ''].join(' ');
  }

  protected select(option: TabsOption): void {
    if (!this.disabled() && !option.disabled && option.value !== this.selectedValue()) {
      this.valueChange.emit(option.value);
    }
  }

  protected handleKeydown(event: KeyboardEvent, option: TabsOption): void {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];

    if (!keys.includes(event.key) || this.disabled()) {
      return;
    }

    event.preventDefault();

    const options = this.options();
    const enabledIndexes = options
      .map((candidate, index) => ({ candidate, index }))
      .filter(({ candidate }) => !candidate.disabled)
      .map(({ index }) => index);

    if (enabledIndexes.length === 0) {
      return;
    }

    const currentIndex = options.findIndex((candidate) => candidate.value === option.value);
    const enabledPosition = Math.max(enabledIndexes.indexOf(currentIndex), 0);
    let nextIndex = enabledIndexes[enabledPosition];

    if (event.key === 'Home') {
      nextIndex = enabledIndexes[0];
    } else if (event.key === 'End') {
      nextIndex = enabledIndexes[enabledIndexes.length - 1];
    } else {
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextPosition = (enabledPosition + direction + enabledIndexes.length) % enabledIndexes.length;
      nextIndex = enabledIndexes[nextPosition];
    }

    const nextOption = options[nextIndex];
    this.focusTab(event.currentTarget, nextIndex);
    this.select(nextOption);
  }

  private focusTab(target: EventTarget | null, index: number): void {
    const tab = target instanceof HTMLElement ? target.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[index] : null;
    tab?.focus();
  }
}
