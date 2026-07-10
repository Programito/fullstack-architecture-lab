import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { map, of, switchMap, type Observable } from 'rxjs';

import { mapHttpError } from '../../../../core/errors/http-error.mapper';
import { Button } from '../../../../shared/ui/button/button';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Input } from '../../../../shared/ui/input/input';
import { Select, type SelectOption } from '../../../../shared/ui/select/select';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { Switch } from '../../../../shared/ui/switch/switch';
import { ToastService } from '../../../../shared/ui/toast/toast';
import { ImageDropzone } from '../../components/image-dropzone/image-dropzone';
import { ALLERGEN_VALUES } from '../../models/allergen.model';
import type { ModifierGroup } from '../../models/modifier-group.model';
import type { Allergen, CreateProductInput, UpdateProductInput } from '../../models/product.model';
import { MenuApiService, type RestaurantProductDetailDto } from '../../services/menu-api.service';
import { ProductImageUploadError, ProductImageUploadService } from '../../services/product-image-upload.service';

const MENU_URL = '/restaurant-pos/menu';

type UploadStatus = 'idle' | 'uploading' | 'failed';

export type SupplementOptionDraft = {
  name: string;
  priceEuros: string;
  imageUrl: string | null;
  uploadStatus: UploadStatus;
  imageErrorMessage: string | null;
};

function emptySupplementOption(): SupplementOptionDraft {
  return { name: '', priceEuros: '', imageUrl: null, uploadStatus: 'idle', imageErrorMessage: null };
}

@Component({
  selector: 'app-product-editor-page',
  imports: [Button, Icon, ImageDropzone, Input, Select, Spinner, Switch, TranslocoPipe],
  templateUrl: './product-editor-page.html',
})
export class ProductEditorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly menuApi = inject(MenuApiService);
  private readonly imageUpload = inject(ProductImageUploadService);
  private readonly toast = inject(ToastService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  private readonly productId = this.route.snapshot.paramMap.get('productId');
  protected readonly isEdit = computed(() => this.productId !== null);

  protected readonly loadingProduct = signal(this.isEdit());
  protected readonly saving = signal(false);
  protected readonly existingProduct = signal<RestaurantProductDetailDto | null>(null);
  protected readonly modifierGroups = signal<ModifierGroup[]>([]);

  // Suplementos: extras con precio propios de este producto (no se comparten con otros).
  // Se guardan como un ModifierGroup con scope='product', creado/actualizado aparte al guardar.
  protected readonly supplementOptions = signal<SupplementOptionDraft[]>([]);
  private readonly existingSupplementGroupId = signal<string | null>(null);

  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly imageUrl = signal<string | null>(null);
  protected readonly priceEuros = signal('');
  protected readonly course = signal('main');
  protected readonly preparationRoute = signal('kitchen');
  protected readonly available = signal(true);
  protected readonly selectedModifierGroupIds = signal<string[]>([]);
  protected readonly selectedAllergens = signal<Allergen[]>([]);
  protected readonly uploadStatus = signal<UploadStatus>('idle');
  protected readonly imageErrorMessage = signal<string | null>(null);
  private readonly pendingRetryFile = signal<File | null>(null);

  protected readonly isValid = computed(() => this.name().trim().length > 0);
  protected readonly saveDisabled = computed(
    () =>
      !this.isValid() ||
      this.uploadStatus() === 'uploading' ||
      this.loadingProduct() ||
      this.supplementOptions().some((option) => option.uploadStatus === 'uploading'),
  );

  protected readonly pageTitle = computed(() =>
    this.transloco.translate(this.isEdit() ? 'menu.product.form.editTitle' : 'menu.product.form.createTitle'),
  );
  protected readonly saveLabel = computed(() =>
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

  // Grupos seleccionados en el orden en que se enviarán (= orden en que aparecen al vender).
  // El backend persiste el índice del array como sortOrder en la tabla puente.
  protected readonly selectedGroupsInOrder = computed(() =>
    this.selectedModifierGroupIds()
      .map((id) => this.modifierGroups().find((group) => group.id === id))
      .filter((group): group is ModifierGroup => group !== undefined),
  );

  protected moveSelectedGroup(groupId: string, delta: -1 | 1): void {
    // Se opera por id y no por índice porque selectedModifierGroupIds puede contener ids que no
    // se muestran en la sub-lista (p. ej. el grupo privado de suplementos al editar).
    const visibleIds = this.selectedGroupsInOrder().map((group) => group.id);
    const visibleIndex = visibleIds.indexOf(groupId);
    const targetIndex = visibleIndex + delta;
    if (visibleIndex < 0 || targetIndex < 0 || targetIndex >= visibleIds.length) return;
    const otherId = visibleIds[targetIndex];

    this.selectedModifierGroupIds.update((ids) => {
      const a = ids.indexOf(groupId);
      const b = ids.indexOf(otherId);
      if (a < 0 || b < 0) return ids;
      const next = [...ids];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  }

  protected readonly allergenOptions = computed<{ value: Allergen; label: string }[]>(() => {
    this.activeLang();
    return ALLERGEN_VALUES.map((value) => ({
      value,
      label: this.transloco.translate(`menu.allergen.${value}`),
    }));
  });

  constructor() {
    // Solo grupos compartidos: los suplementos privados de otros productos (scope='product')
    // no deben aparecer como si fueran modificadores enlazables desde aquí.
    this.menuApi.listModifierGroups('shared').subscribe({
      next: (groups) => this.modifierGroups.set(groups),
    });

    if (this.productId) {
      const id = this.productId;
      this.menuApi.getProduct(id).subscribe({
        next: (product) => {
          this.existingProduct.set(product);
          this.applyProduct(product);
          this.loadingProduct.set(false);
        },
        error: () => {
          this.loadingProduct.set(false);
          this.toast.danger({ title: this.transloco.translate('menu.product.errors.loadFailed') });
          this.router.navigateByUrl(MENU_URL);
        },
      });

      this.menuApi.listModifierGroups('product').subscribe({
        next: (groups) => {
          const owned = groups.find((group) => group.ownerRestaurantProductId === id);
          if (owned) {
            this.existingSupplementGroupId.set(owned.id);
            this.supplementOptions.set(
              owned.options.map((option) => ({
                name: option.name,
                priceEuros: option.priceDelta.toFixed(2),
                imageUrl: option.imageUrl ?? null,
                uploadStatus: 'idle' as UploadStatus,
                imageErrorMessage: null,
              })),
            );
          }
        },
      });
    }
  }

  protected addSupplementOption(): void {
    this.supplementOptions.update((options) => [...options, emptySupplementOption()]);
  }

  protected removeSupplementOption(index: number): void {
    this.supplementOptions.update((options) => options.filter((_, i) => i !== index));
    this.pendingSupplementFiles.delete(index);
  }

  protected updateSupplementOptionName(index: number, value: string): void {
    this.supplementOptions.update((options) => options.map((option, i) => (i === index ? { ...option, name: value } : option)));
  }

  protected updateSupplementOptionPrice(index: number, value: string): void {
    this.supplementOptions.update((options) => options.map((option, i) => (i === index ? { ...option, priceEuros: value } : option)));
  }

  protected moveSupplementOption(index: number, delta: -1 | 1): void {
    this.supplementOptions.update((options) => {
      const target = index + delta;
      if (target < 0 || target >= options.length) return options;
      const next = [...options];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    const fileA = this.pendingSupplementFiles.get(index);
    const fileB = this.pendingSupplementFiles.get(index + delta);
    if (fileB !== undefined) this.pendingSupplementFiles.set(index, fileB); else this.pendingSupplementFiles.delete(index);
    if (fileA !== undefined) this.pendingSupplementFiles.set(index + delta, fileA); else this.pendingSupplementFiles.delete(index + delta);
  }

  /** Files por fila de suplemento para poder reintentar la subida sin volver a pedir el archivo. */
  private readonly pendingSupplementFiles = new Map<number, File>();

  protected handleSupplementFileSelected(index: number, file: File): void {
    this.pendingSupplementFiles.set(index, file);
    this.uploadSupplementImage(index, file);
  }

  protected handleSupplementRetryUpload(index: number): void {
    const file = this.pendingSupplementFiles.get(index);
    if (!file || this.supplementOptions()[index]?.uploadStatus === 'uploading') {
      return;
    }
    this.uploadSupplementImage(index, file);
  }

  protected handleSupplementRemoveImage(index: number): void {
    this.supplementOptions.update((options) =>
      options.map((option, i) =>
        i === index ? { ...option, imageUrl: null, uploadStatus: 'idle' as UploadStatus, imageErrorMessage: null } : option,
      ),
    );
    this.pendingSupplementFiles.delete(index);
  }

  private uploadSupplementImage(index: number, file: File): void {
    this.supplementOptions.update((options) =>
      options.map((option, i) =>
        i === index ? { ...option, uploadStatus: 'uploading' as UploadStatus, imageErrorMessage: null } : option,
      ),
    );

    this.imageUpload.uploadProductImage(file, 'modifier-options').subscribe({
      next: (uploadedUrl) => {
        this.supplementOptions.update((options) =>
          options.map((option, i) =>
            i === index ? { ...option, imageUrl: uploadedUrl, uploadStatus: 'idle' as UploadStatus, imageErrorMessage: null } : option,
          ),
        );
        this.pendingSupplementFiles.delete(index);
      },
      error: (error: unknown) => {
        this.supplementOptions.update((options) =>
          options.map((option, i) =>
            i === index
              ? { ...option, uploadStatus: 'failed' as UploadStatus, imageErrorMessage: this.mapUploadErrorToMessage(error) }
              : option,
          ),
        );
      },
    });
  }

  private applyProduct(product: RestaurantProductDetailDto): void {
    this.name.set(product.name);
    this.description.set(product.description ?? '');
    this.imageUrl.set(product.imageUrl ?? null);
    this.priceEuros.set((product.priceCents / 100).toFixed(2));
    this.course.set(product.course);
    this.preparationRoute.set(product.preparationRoute);
    this.available.set(product.isAvailable);
    this.selectedModifierGroupIds.set([...(product.modifierGroupIds ?? [])]);
    this.selectedAllergens.set([...(product.allergens ?? [])]);
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

  protected cancel(): void {
    this.router.navigateByUrl(MENU_URL);
  }

  protected save(): void {
    if (this.saveDisabled() || this.saving()) return;
    const name = this.name().trim();
    if (!name) return;
    const priceCents = Math.round(parseFloat(this.priceEuros().replace(',', '.') || '0') * 100);

    this.saving.set(true);
    const existing = this.existingProduct();

    const req$: Observable<unknown> = existing
      ? this.upsertSupplementGroup$(existing.id, name).pipe(
          switchMap((supplementGroupId) =>
            this.menuApi.updateProduct(existing.id, {
              name,
              description: this.description().trim() || null,
              imageUrl: this.imageUrl(),
              modifierGroupIds: this.mergeSupplementGroupId(supplementGroupId),
              allergens: this.selectedAllergens(),
              priceCents,
              course: this.course() as UpdateProductInput['course'],
              preparationRoute: this.preparationRoute() as UpdateProductInput['preparationRoute'],
              isAvailable: this.available(),
            } satisfies UpdateProductInput),
          ),
        )
      : this.menuApi
          .createProduct({
            name,
            description: this.description().trim() || undefined,
            imageUrl: this.imageUrl(),
            modifierGroupIds: this.selectedModifierGroupIds(),
            allergens: this.selectedAllergens(),
            priceCents,
            currency: 'EUR',
            course: this.course() as CreateProductInput['course'],
            preparationRoute: this.preparationRoute() as CreateProductInput['preparationRoute'],
          } satisfies CreateProductInput)
          .pipe(
            switchMap((created) =>
              this.upsertSupplementGroup$(created.id, name).pipe(
                switchMap((supplementGroupId) =>
                  supplementGroupId
                    ? this.menuApi.updateProduct(created.id, {
                        modifierGroupIds: this.mergeSupplementGroupId(supplementGroupId),
                      } satisfies UpdateProductInput)
                    : of(created),
                ),
              ),
            ),
          );

    req$.subscribe({
      complete: () => {
        this.saving.set(false);
        this.toast.success({
          title: this.transloco.translate(existing ? 'menu.product.success.updated' : 'menu.product.success.created'),
        });
        this.router.navigateByUrl(MENU_URL);
      },
      error: (err) => {
        this.saving.set(false);
        const appError = mapHttpError(err);
        const key = appError.type === 'conflict' ? 'menu.product.errors.nameTaken' : 'menu.product.errors.saveFailed';
        this.toast.danger({ title: this.transloco.translate(key) });
      },
    });
  }

  private mergeSupplementGroupId(supplementGroupId: string | null): string[] {
    const ids = this.selectedModifierGroupIds().filter((id) => id !== this.existingSupplementGroupId());
    return supplementGroupId ? [...ids, supplementGroupId] : ids;
  }

  /**
   * Crea, actualiza o borra (según corresponda) el ModifierGroup scope='product' que guarda los
   * suplementos propios de este producto. Devuelve su id (o null si no hay suplementos).
   */
  private upsertSupplementGroup$(ownerRestaurantProductId: string, productDisplayName: string): Observable<string | null> {
    const validOptions = this.supplementOptions().filter((option) => option.name.trim().length > 0);
    const existingGroupId = this.existingSupplementGroupId();

    if (validOptions.length === 0) {
      // Se desvincula del producto (mergeSupplementGroupId lo quita de modifierGroupIds); no se
      // borra aquí porque en ese momento sigue asignado y el borrado fallaría (modifier_group_in_use).
      return of(null);
    }

    const payload = {
      name: `${this.transloco.translate('menu.product.form.supplementsGroupPrefix')} — ${productDisplayName}`,
      selectionType: 'multiple' as const,
      minSelections: 0,
      maxSelections: validOptions.length,
      isRequired: false,
      options: validOptions.map((option) => ({
        name: option.name.trim(),
        priceDeltaCents: Math.round(parseFloat(option.priceEuros.replace(',', '.') || '0') * 100),
        ...(option.imageUrl ? { imageUrl: option.imageUrl } : {}),
      })),
    };

    return existingGroupId
      ? this.menuApi.updateModifierGroup(existingGroupId, payload).pipe(map((group) => group.id))
      : this.menuApi
          .createModifierGroup({ ...payload, scope: 'product', ownerRestaurantProductId })
          .pipe(map((group) => group.id));
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
