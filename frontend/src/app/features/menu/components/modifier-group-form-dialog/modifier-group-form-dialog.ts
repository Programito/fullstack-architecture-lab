import { booleanAttribute, Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Input } from '../../../../shared/ui/input/input';
import { Select, type SelectOption } from '../../../../shared/ui/select/select';
import { Switch } from '../../../../shared/ui/switch/switch';
import type { CreateModifierGroupRequest } from '../../services/menu-api.service';

export type ModifierGroupOptionDraft = { name: string; priceDeltaCents: number };

@Component({
  selector: 'app-modifier-group-form-dialog',
  imports: [Button, Dialog, Icon, Input, Select, Switch, TranslocoPipe],
  templateUrl: './modifier-group-form-dialog.html',
})
export class ModifierGroupFormDialog {
  readonly open = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly closed = output<void>();
  readonly confirmed = output<CreateModifierGroupRequest>();

  protected readonly name = signal('');
  protected readonly selectionType = signal<'single' | 'multiple'>('single');
  protected readonly isRequired = signal(false);
  protected readonly options = signal<ModifierGroupOptionDraft[]>([{ name: '', priceDeltaCents: 0 }]);

  protected readonly selectionTypeOptions: SelectOption[] = [
    { value: 'single', label: 'Una opción' },
    { value: 'multiple', label: 'Varias opciones' },
  ];

  protected readonly isValid = computed(() => {
    const nameOk = this.name().trim().length > 0;
    const optionsOk = this.options().length > 0 && this.options().every((o) => o.name.trim().length > 0);
    return nameOk && optionsOk;
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.name.set('');
        this.selectionType.set('single');
        this.isRequired.set(false);
        this.options.set([{ name: '', priceDeltaCents: 0 }]);
      }
    });
  }

  protected addOption(): void {
    this.options.update((opts) => [...opts, { name: '', priceDeltaCents: 0 }]);
  }

  protected removeOption(index: number): void {
    this.options.update((opts) => opts.filter((_, i) => i !== index));
  }

  protected updateOptionName(index: number, value: string): void {
    this.options.update((opts) => opts.map((opt, i) => (i === index ? { ...opt, name: value } : opt)));
  }

  protected updateOptionPrice(index: number, raw: string): void {
    const euros = parseFloat(raw.replace(',', '.') || '0');
    const cents = isNaN(euros) ? 0 : Math.round(euros * 100);
    this.options.update((opts) => opts.map((opt, i) => (i === index ? { ...opt, priceDeltaCents: cents } : opt)));
  }

  protected handleConfirm(): void {
    if (!this.isValid() || this.loading()) return;
    const type = this.selectionType();
    this.confirmed.emit({
      name: this.name().trim(),
      selectionType: type,
      minSelections: this.isRequired() ? 1 : 0,
      maxSelections: type === 'single' ? 1 : this.options().length,
      isRequired: this.isRequired(),
      options: this.options().map((o) => ({ name: o.name.trim(), priceDeltaCents: o.priceDeltaCents })),
    });
  }
}
