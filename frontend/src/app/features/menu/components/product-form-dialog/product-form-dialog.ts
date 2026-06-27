import { booleanAttribute, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Input } from '../../../../shared/ui/input/input';
import { Select, type SelectOption } from '../../../../shared/ui/select/select';
import { Switch } from '../../../../shared/ui/switch/switch';
import type { CreateProductInput, UpdateProductInput } from '../../models/product.model';
import type { RestaurantProductDetailDto } from '../../services/menu-api.service';

@Component({
  selector: 'app-product-form-dialog',
  imports: [Dialog, Input, Select, Switch, TranslocoPipe],
  templateUrl: './product-form-dialog.html',
})
export class ProductFormDialog {
  readonly open = input(false, { transform: booleanAttribute });
  readonly product = input<RestaurantProductDetailDto | null>(null);
  readonly loading = input(false);
  readonly closed = output<void>();
  readonly confirmed = output<CreateProductInput | UpdateProductInput>();

  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  protected readonly isEdit = computed(() => this.product() !== null);

  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly priceEuros = signal('');
  protected readonly course = signal('main');
  protected readonly route = signal('kitchen');
  protected readonly available = signal(true);

  protected readonly isValid = computed(() => this.name().trim().length > 0);

  protected readonly dialogTitle = computed(() =>
    this.transloco.translate(this.isEdit() ? 'menu.product.form.editTitle' : 'menu.product.form.createTitle'),
  );
  protected readonly confirmLabel = computed(() =>
    this.transloco.translate(this.isEdit() ? 'menu.product.form.save' : 'menu.product.form.create'),
  );

  protected readonly courseOptions = computed<SelectOption[]>(() => {
    this.activeLang();
    return [
      { value: 'drinks', label: this.transloco.translate('menu.course.drinks') },
      { value: 'starter', label: this.transloco.translate('menu.course.starter') },
      { value: 'main', label: this.transloco.translate('menu.course.main') },
      { value: 'dessert', label: this.transloco.translate('menu.course.dessert') },
      { value: 'other', label: this.transloco.translate('menu.course.other') },
    ];
  });

  protected readonly routeOptions = computed<SelectOption[]>(() => {
    this.activeLang();
    return [
      { value: 'direct', label: this.transloco.translate('menu.page.preparationRoutes.direct') },
      { value: 'bar', label: this.transloco.translate('menu.page.preparationRoutes.bar') },
      { value: 'kitchen', label: this.transloco.translate('menu.page.preparationRoutes.kitchen') },
      { value: 'cold_station', label: this.transloco.translate('menu.page.preparationRoutes.cold') },
      { value: 'dessert_station', label: this.transloco.translate('menu.page.preparationRoutes.dessert') },
    ];
  });

  constructor() {
    effect(() => {
      const product = this.product();
      if (this.open()) {
        if (product) {
          this.name.set(product.name);
          this.description.set(product.description ?? '');
          this.priceEuros.set((product.priceCents / 100).toFixed(2));
          this.course.set(product.course);
          this.route.set(product.preparationRoute);
          this.available.set(product.isAvailable);
        } else {
          this.name.set('');
          this.description.set('');
          this.priceEuros.set('');
          this.course.set('main');
          this.route.set('kitchen');
          this.available.set(true);
        }
      }
    });
  }

  protected handleConfirm(): void {
    const name = this.name().trim();
    if (!name) return;
    const priceCents = Math.round(parseFloat(this.priceEuros().replace(',', '.') || '0') * 100);

    if (this.isEdit()) {
      this.confirmed.emit({
        name,
        description: this.description().trim() || null,
        priceCents,
        course: this.course() as UpdateProductInput['course'],
        preparationRoute: this.route() as UpdateProductInput['preparationRoute'],
        isAvailable: this.available(),
      } as UpdateProductInput);
    } else {
      this.confirmed.emit({
        name,
        description: this.description().trim() || undefined,
        priceCents,
        currency: 'EUR',
        course: this.course() as CreateProductInput['course'],
        preparationRoute: this.route() as CreateProductInput['preparationRoute'],
      } as CreateProductInput);
    }
  }
}
