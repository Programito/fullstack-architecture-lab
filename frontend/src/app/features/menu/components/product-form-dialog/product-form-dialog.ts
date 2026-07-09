import { booleanAttribute, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Input } from '../../../../shared/ui/input/input';
import { Select, type SelectOption } from '../../../../shared/ui/select/select';
import { Switch } from '../../../../shared/ui/switch/switch';
import { ImageDropzone } from '../image-dropzone/image-dropzone';
import type { ModifierGroup } from '../../models/modifier-group.model';
import type { Allergen, CreateProductInput, UpdateProductInput } from '../../models/product.model';
import type { RestaurantProductDetailDto } from '../../services/menu-api.service';
import {
  ProductImageUploadError,
  ProductImageUploadService,
} from '../../services/product-image-upload.service';

type UploadStatus = 'idle' | 'uploading' | 'failed';

const ALLERGEN_VALUES: readonly Allergen[] = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soybeans',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
] as const;

@Component({
  selector: 'app-product-form-dialog',
  imports: [Dialog, ImageDropzone, Input, Select, Switch, TranslocoPipe],
  templateUrl: './product-form-dialog.html',
})
export class ProductFormDialog {
  readonly open = input(false, { transform: booleanAttribute });
  readonly product = input<RestaurantProductDetailDto | null>(null);
  readonly modifierGroups = input<ModifierGroup[]>([]);
  readonly loading = input(false);
  readonly closed = output<void>();
  readonly confirmed = output<CreateProductInput | UpdateProductInput>();

  private readonly transloco = inject(TranslocoService);
  private readonly imageUpload = inject(ProductImageUploadService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  protected readonly isEdit = computed(() => this.product() !== null);

  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly imageUrl = signal<string | null>(null);
  protected readonly priceEuros = signal('');
  protected readonly course = signal('main');
  protected readonly route = signal('kitchen');
  protected readonly available = signal(true);
  protected readonly selectedModifierGroupIds = signal<string[]>([]);
  protected readonly selectedAllergens = signal<Allergen[]>([]);
  protected readonly uploadStatus = signal<UploadStatus>('idle');
  protected readonly imageErrorMessage = signal<string | null>(null);
  private readonly pendingRetryFile = signal<File | null>(null);

  protected readonly isValid = computed(() => this.name().trim().length > 0);
  protected readonly confirmDisabled = computed(() => !this.isValid() || this.uploadStatus() === 'uploading');

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

  protected readonly sortedModifierGroups = computed(() =>
    [...this.modifierGroups()].sort((left, right) => left.name.localeCompare(right.name)),
  );

  protected readonly allergenOptions = computed<{ value: Allergen; label: string }[]>(() => {
    this.activeLang();
    return ALLERGEN_VALUES.map((value) => ({
      value,
      label: this.transloco.translate(`menu.allergen.${value}`),
    }));
  });

  constructor() {
    effect(() => {
      const product = this.product();
      if (this.open()) {
        if (product) {
          this.name.set(product.name);
          this.description.set(product.description ?? '');
          this.imageUrl.set(product.imageUrl ?? null);
          this.priceEuros.set((product.priceCents / 100).toFixed(2));
          this.course.set(product.course);
          this.route.set(product.preparationRoute);
          this.available.set(product.isAvailable);
          this.selectedModifierGroupIds.set([...(product.modifierGroupIds ?? [])]);
          this.selectedAllergens.set([...(product.allergens ?? [])]);
        } else {
          this.name.set('');
          this.description.set('');
          this.imageUrl.set(null);
          this.priceEuros.set('');
          this.course.set('main');
          this.route.set('kitchen');
          this.available.set(true);
          this.selectedModifierGroupIds.set([]);
          this.selectedAllergens.set([]);
        }

        this.uploadStatus.set('idle');
        this.imageErrorMessage.set(null);
        this.pendingRetryFile.set(null);
      }
    });
  }

  protected handleFileSelected(file: File): void {
    this.pendingRetryFile.set(file);
    this.uploadSelectedFile(file);
  }

  protected handleRetryUpload(): void {
    const file = this.pendingRetryFile();
    if (!file || this.uploadStatus() === 'uploading') {
      return;
    }

    this.uploadSelectedFile(file);
  }

  protected handleRemoveImage(): void {
    this.imageUrl.set(null);
    this.uploadStatus.set('idle');
    this.imageErrorMessage.set(null);
    this.pendingRetryFile.set(null);
  }

  protected toggleModifierGroup(modifierGroupId: string, checked: boolean): void {
    this.selectedModifierGroupIds.update((currentIds) => {
      if (checked) {
        return currentIds.includes(modifierGroupId) ? currentIds : [...currentIds, modifierGroupId];
      }

      return currentIds.filter((currentId) => currentId !== modifierGroupId);
    });
  }

  protected toggleAllergen(allergen: Allergen, checked: boolean): void {
    this.selectedAllergens.update((currentAllergens) => {
      if (checked) {
        return currentAllergens.includes(allergen) ? currentAllergens : [...currentAllergens, allergen];
      }

      return currentAllergens.filter((currentAllergen) => currentAllergen !== allergen);
    });
  }

  private uploadSelectedFile(file: File): void {
    this.uploadStatus.set('uploading');
    this.imageErrorMessage.set(null);
    this.imageUpload.uploadProductImage(file).subscribe({
      next: (uploadedUrl) => {
        this.imageUrl.set(uploadedUrl);
        this.uploadStatus.set('idle');
        this.imageErrorMessage.set(null);
        this.pendingRetryFile.set(null);
      },
      error: (error: unknown) => {
        this.uploadStatus.set('failed');
        this.imageErrorMessage.set(this.mapUploadErrorToMessage(error));
      },
    });
  }

  protected handleConfirm(): void {
    const name = this.name().trim();
    if (!name || this.uploadStatus() === 'uploading') return;
    const priceCents = Math.round(parseFloat(this.priceEuros().replace(',', '.') || '0') * 100);

    if (this.isEdit()) {
      this.confirmed.emit({
        name,
        description: this.description().trim() || null,
        imageUrl: this.imageUrl(),
        modifierGroupIds: this.selectedModifierGroupIds(),
        allergens: this.selectedAllergens(),
        priceCents,
        course: this.course() as UpdateProductInput['course'],
        preparationRoute: this.route() as UpdateProductInput['preparationRoute'],
        isAvailable: this.available(),
      } as UpdateProductInput);
    } else {
      this.confirmed.emit({
        name,
        description: this.description().trim() || undefined,
        imageUrl: this.imageUrl(),
        modifierGroupIds: this.selectedModifierGroupIds(),
        allergens: this.selectedAllergens(),
        priceCents,
        currency: 'EUR',
        course: this.course() as CreateProductInput['course'],
        preparationRoute: this.route() as CreateProductInput['preparationRoute'],
      } as CreateProductInput);
    }
  }

  private mapUploadErrorToMessage(error: unknown): string {
    if (!(error instanceof ProductImageUploadError)) {
      return this.transloco.translate('menu.product.form.uploadFailed');
    }

    switch (error.code) {
      case 'invalid-type':
        return this.transloco.translate('menu.product.form.invalidImageType');
      case 'file-too-large':
        return this.transloco.translate('menu.product.form.imageTooLarge');
      case 'image-too-small':
        return this.transloco.translate('menu.product.form.imageTooSmall');
      case 'invalid-response':
      case 'upload-failed':
      default:
        return this.transloco.translate('menu.product.form.uploadFailed');
    }
  }
}
