import { Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Progress } from '../../../../shared/ui/progress/progress';
import type { MenuAuditCounter, MenuAuditFilter, MenuAuditWarningType } from '../../models/menu-audit.model';

const WARNING_ICONS: Record<MenuAuditWarningType, string> = {
  'missing-image': 'image',
  'missing-description': 'description',
  'missing-section': 'category',
  unavailable: 'visibility_off',
  'weak-combo-summary': 'inventory_2',
  'weak-customization-summary': 'tune',
};

@Component({
  selector: 'app-menu-health-panel',
  imports: [Badge, Button, EmptyState, Icon, Progress, TranslocoPipe],
  templateUrl: './menu-health-panel.html',
})
export class MenuHealthPanel {
  readonly counters = input<readonly MenuAuditCounter[]>([]);
  readonly selectedFilter = input<MenuAuditFilter>('all');
  readonly totalProducts = input(0);
  readonly productsWithIssues = input(0);

  readonly filterSelected = output<MenuAuditFilter>();
  readonly exportRequested = output<void>();

  protected readonly totalIssues = computed(() => this.counters().reduce((sum, counter) => sum + counter.count, 0));

  protected readonly hasHealthScore = computed(() => this.totalProducts() > 0);

  protected readonly healthPercent = computed(() => {
    const total = this.totalProducts();
    if (total <= 0) {
      return 100;
    }
    const clean = Math.max(total - this.productsWithIssues(), 0);
    return Math.round((clean / total) * 100);
  });

  protected readonly healthVariant = computed<'primary' | 'danger'>(() => (this.healthPercent() < 70 ? 'danger' : 'primary'));

  protected isSelected(type: MenuAuditFilter): boolean {
    return this.selectedFilter() === type;
  }

  protected selectFilter(type: MenuAuditFilter): void {
    this.filterSelected.emit(type);
  }

  protected badgeVariant(priority: MenuAuditCounter['priority']): 'danger' | 'warning' | 'neutral' {
    return priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'neutral';
  }

  protected accentClass(priority: MenuAuditCounter['priority']): string {
    return priority === 'high'
      ? 'border-l-4 border-l-red-500'
      : priority === 'medium'
        ? 'border-l-4 border-l-amber-500'
        : 'border-l-4 border-l-slate-400';
  }

  protected iconForType(type: MenuAuditWarningType): string {
    return WARNING_ICONS[type];
  }
}
