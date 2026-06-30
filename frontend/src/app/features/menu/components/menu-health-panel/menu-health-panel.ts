import { Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import type { MenuAuditCounter, MenuAuditFilter } from '../../models/menu-audit.model';

@Component({
  selector: 'app-menu-health-panel',
  imports: [Badge, Button, Icon, TranslocoPipe],
  templateUrl: './menu-health-panel.html',
})
export class MenuHealthPanel {
  readonly counters = input<readonly MenuAuditCounter[]>([]);
  readonly selectedFilter = input<MenuAuditFilter>('all');

  readonly filterSelected = output<MenuAuditFilter>();

  protected readonly topCounters = computed(() => this.counters().slice(0, 3));

  protected isSelected(type: MenuAuditFilter): boolean {
    return this.selectedFilter() === type;
  }

  protected selectFilter(type: MenuAuditFilter): void {
    this.filterSelected.emit(type);
  }

  protected badgeVariant(priority: MenuAuditCounter['priority']): 'danger' | 'warning' | 'neutral' {
    return priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'neutral';
  }
}
