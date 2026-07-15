import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { mapHttpError } from '../../../../core/errors/http-error.mapper';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Input } from '../../../../shared/ui/input/input';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { Switch } from '../../../../shared/ui/switch/switch';
import { ToastService } from '../../../../shared/ui/toast/toast';
import type { TaxRate } from '../../models/tax-rate.model';
import { MenuApiService } from '../../services/menu-api.service';

const MENU_URL = '/restaurant-pos/menu';

@Component({
  selector: 'app-tax-rates-page',
  imports: [Button, Dialog, Icon, Input, Spinner, Switch, TranslocoPipe],
  templateUrl: './tax-rates-page.html',
})
export class TaxRatesPage implements OnInit {
  private readonly menuApi = inject(MenuApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  protected readonly taxRates = signal<TaxRate[]>([]);
  protected readonly loading = signal(true);

  protected readonly formOpen = signal(false);
  protected readonly formLoading = signal(false);
  protected readonly editingTaxRateId = signal<string | null>(null);
  protected readonly formName = signal('');
  protected readonly formRatePercent = signal('');

  protected readonly deleteTarget = signal<TaxRate | null>(null);
  protected readonly deleteOpen = signal(false);
  protected readonly deleteLoading = signal(false);

  protected readonly sortedTaxRates = computed(() => [...this.taxRates()].sort((a, b) => a.name.localeCompare(b.name)));

  protected readonly formTitle = computed(() =>
    this.transloco.translate(this.editingTaxRateId() ? 'menu.taxRates.edit' : 'menu.taxRates.add'),
  );

  protected readonly formValid = computed(() => {
    const name = this.formName().trim();
    const rate = parseFloat(this.formRatePercent().replace(',', '.'));
    return name.length > 0 && !Number.isNaN(rate) && rate >= 0 && rate <= 100;
  });

  ngOnInit(): void {
    this.loadTaxRates();
  }

  protected back(): void {
    this.router.navigateByUrl(MENU_URL);
  }

  private loadTaxRates(): void {
    this.loading.set(true);
    this.menuApi.listTaxRates().subscribe({
      next: (rates) => {
        this.taxRates.set(rates);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.danger({ title: this.transloco.translate('menu.taxRates.loadError') });
      },
    });
  }

  protected openCreateForm(): void {
    this.editingTaxRateId.set(null);
    this.formName.set('');
    this.formRatePercent.set('');
    this.formOpen.set(true);
  }

  protected openEditForm(taxRate: TaxRate): void {
    this.editingTaxRateId.set(taxRate.id);
    this.formName.set(taxRate.name);
    this.formRatePercent.set(String(taxRate.ratePercent));
    this.formOpen.set(true);
  }

  protected cancelForm(): void {
    this.formOpen.set(false);
  }

  protected submitForm(): void {
    if (!this.formValid() || this.formLoading()) return;
    const name = this.formName().trim();
    const ratePercent = parseFloat(this.formRatePercent().replace(',', '.'));
    const editingId = this.editingTaxRateId();

    this.formLoading.set(true);
    const req$ = editingId
      ? this.menuApi.updateTaxRate(editingId, { name, ratePercent })
      : this.menuApi.createTaxRate({ name, ratePercent });

    req$.subscribe({
      next: (taxRate) => {
        this.taxRates.update((rates) =>
          editingId ? rates.map((r) => (r.id === taxRate.id ? taxRate : r)) : [...rates, taxRate],
        );
        this.formLoading.set(false);
        this.formOpen.set(false);
      },
      error: (error: unknown) => {
        this.formLoading.set(false);
        this.toast.danger({ title: mapHttpError(error).message });
      },
    });
  }

  protected toggleActive(taxRate: TaxRate, isActive: boolean): void {
    this.menuApi.updateTaxRate(taxRate.id, { isActive }).subscribe({
      next: (updated) => {
        this.taxRates.update((rates) => rates.map((r) => (r.id === updated.id ? updated : r)));
      },
      error: (error: unknown) => {
        this.toast.danger({ title: mapHttpError(error).message });
      },
    });
  }

  protected askDelete(taxRate: TaxRate): void {
    this.deleteTarget.set(taxRate);
    this.deleteOpen.set(true);
  }

  protected cancelDelete(): void {
    this.deleteOpen.set(false);
    this.deleteTarget.set(null);
  }

  protected confirmDelete(): void {
    const taxRate = this.deleteTarget();
    if (!taxRate) return;
    this.deleteLoading.set(true);
    this.menuApi.deleteTaxRate(taxRate.id).subscribe({
      next: () => {
        this.taxRates.update((rates) => rates.filter((r) => r.id !== taxRate.id));
        this.deleteLoading.set(false);
        this.deleteOpen.set(false);
        this.deleteTarget.set(null);
      },
      error: (error: unknown) => {
        this.deleteLoading.set(false);
        // El backend devuelve tax_rate_in_use si hay productos usando este tipo de IVA — mejor
        // desactivarlo (toggleActive) que borrarlo en ese caso.
        this.toast.danger({ title: mapHttpError(error).message });
      },
    });
  }
}
