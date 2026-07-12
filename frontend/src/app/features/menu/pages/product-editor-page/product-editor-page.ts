import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { filter, forkJoin, map, of, switchMap, take, type Observable } from 'rxjs';

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
import type { RestaurantProductSummaryDto } from '../../../restaurant-pos/api/restaurant-pos-api.models';
import { RestaurantContextStore } from '../../../restaurant-pos/state/restaurant-context.store';
import {
  MenuApiService,
  type CreateComboSlotRequest,
  type CreatePlatterComponentRequest,
  type RestaurantProductDetailDto,
  type UpdateComboSlotRequest,
  type UpdatePlatterComponentRequest,
} from '../../services/menu-api.service';
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

// Combo (huecos con productos permitidos) y platter (ingredientes) solo son editables cuando el
// producto ya existe y es de ese tipo — ver docs/superpowers/plans/2026-07-12-combo-platter-admin.md.
export type ComboSlotOptionDraft = {
  id?: string; // ausente = opción nueva, aún no guardada
  restaurantProductId: string;
  supplementPriceEuros: string;
  isDefault: boolean;
};

export type ComboSlotDraft = {
  id?: string; // ausente = slot nuevo
  name: string;
  nameCa: string;
  nameEn: string;
  minSelections: string;
  maxSelections: string;
  isRequired: boolean;
  options: ComboSlotOptionDraft[];
};

function emptyComboSlotOption(): ComboSlotOptionDraft {
  return { restaurantProductId: '', supplementPriceEuros: '0', isDefault: false };
}

function emptyComboSlot(): ComboSlotDraft {
  return { name: '', nameCa: '', nameEn: '', minSelections: '0', maxSelections: '1', isRequired: false, options: [emptyComboSlotOption()] };
}

export type PlatterComponentDraft = {
  id?: string; // ausente = componente nuevo
  name: string;
  nameCa: string;
  nameEn: string;
  // '' = no se toca al guardar (no se puede precargar desde el menú de lectura); ver
  // ComboOrPlatterMenuData en menu-api.service.ts.
  componentProductId: string;
  quantity: string;
  isRemovable: boolean;
  isReplaceable: boolean;
};

function emptyPlatterComponent(): PlatterComponentDraft {
  return { name: '', nameCa: '', nameEn: '', componentProductId: '', quantity: '', isRemovable: true, isReplaceable: false };
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
  private readonly restaurantContext = inject(RestaurantContextStore);
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

  // Combo (slots) y platter (componentes): solo aplican al editar un producto ya existente de
  // ese tipo — no hay forma de crear un producto combo/platter desde este editor todavía.
  protected readonly productType = computed(() => this.existingProduct()?.productType ?? 'simple');
  protected readonly isCombo = computed(() => this.productType() === 'combo');
  protected readonly isPlatter = computed(() => this.productType() === 'platter');

  protected readonly comboSlots = signal<ComboSlotDraft[]>([]);
  private readonly deletedComboSlotIds = signal<string[]>([]);

  protected readonly platterComponentDrafts = signal<PlatterComponentDraft[]>([]);
  private readonly deletedPlatterComponentIds = signal<string[]>([]);

  private readonly availableProducts = signal<RestaurantProductSummaryDto[]>([]);

  protected readonly comboOptionProductChoices = computed<SelectOption[]>(() => {
    const currentId = this.existingProduct()?.id;
    return this.availableProducts()
      .filter((product) => product.id !== currentId)
      .map((product) => ({ value: product.id, label: product.displayName ?? product.name }));
  });

  protected readonly platterComponentProductChoices = computed<SelectOption[]>(() => {
    this.activeLang();
    return [
      { value: '', label: this.transloco.translate('menu.product.form.platter.keepProduct') },
      ...this.availableProducts().map((product) => ({ value: product.productId, label: product.displayName ?? product.name })),
    ];
  });

  protected readonly name = signal('');
  // Nombres opcionales en catalan/ingles, junto al `name` canonico en castellano.
  // Ver docs/superpowers/plans/2026-07-11-menu-multilingual-names.md.
  protected readonly nameCa = signal('');
  protected readonly nameEn = signal('');
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
    // En una entrada directa por URL (o F5) el contexto de restaurante puede no estar cargado
    // todavía, y MenuApiService.restaurantId lanzaría al construir el componente, dejando la
    // ruta en blanco. Se espera al primer restaurante activo antes de disparar las cargas.
    toObservable(this.restaurantContext.activeRestaurant)
      .pipe(
        filter((restaurant) => restaurant !== null),
        take(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.loadInitialData());
  }

  private loadInitialData(): void {
    // Solo grupos compartidos: los suplementos privados de otros productos (scope='product')
    // no deben aparecer como si fueran modificadores enlazables desde aquí.
    this.menuApi.listModifierGroups('shared').subscribe({
      next: (groups) => this.modifierGroups.set(groups),
    });

    this.menuApi.listProducts().subscribe({
      next: (products) => this.availableProducts.set(products),
    });

    if (this.productId) {
      const id = this.productId;
      this.menuApi.getProduct(id).subscribe({
        next: (product) => {
          this.existingProduct.set(product);
          this.applyProduct(product);
          this.loadingProduct.set(false);

          if (product.productType === 'combo' || product.productType === 'platter') {
            this.menuApi.getComboOrPlatterData(product.id).subscribe({
              next: ({ comboSlots, platterComponents }) => {
                this.comboSlots.set(
                  comboSlots.map((slot) => ({
                    id: slot.id,
                    name: slot.name,
                    nameCa: slot.nameI18n?.ca ?? '',
                    nameEn: slot.nameI18n?.en ?? '',
                    minSelections: String(slot.minSelections),
                    maxSelections: String(slot.maxSelections),
                    isRequired: slot.isRequired,
                    options: slot.options.map((option) => ({
                      id: option.id,
                      restaurantProductId: option.restaurantProductId,
                      supplementPriceEuros: (option.supplementPriceCents / 100).toFixed(2),
                      isDefault: false, // no viene en la vía de lectura; ver ComboOrPlatterMenuData
                    })),
                  })),
                );
                this.platterComponentDrafts.set(
                  platterComponents.map((component) => ({
                    id: component.id,
                    name: component.name,
                    nameCa: component.nameI18n?.ca ?? '',
                    nameEn: component.nameI18n?.en ?? '',
                    componentProductId: '',
                    quantity: '',
                    isRemovable: component.removable,
                    isReplaceable: component.replaceable,
                  })),
                );
              },
            });
          }
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

  // ── Combo slots ──────────────────────────────────────────────────────────────

  protected addComboSlot(): void {
    this.comboSlots.update((slots) => [...slots, emptyComboSlot()]);
  }

  protected removeComboSlot(index: number): void {
    const slot = this.comboSlots()[index];
    if (slot?.id) this.deletedComboSlotIds.update((ids) => [...ids, slot.id!]);
    this.comboSlots.update((slots) => slots.filter((_, i) => i !== index));
  }

  protected updateComboSlotField(index: number, field: 'name' | 'nameCa' | 'nameEn' | 'minSelections' | 'maxSelections', value: string): void {
    this.comboSlots.update((slots) => slots.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)));
  }

  protected toggleComboSlotRequired(index: number, checked: boolean): void {
    this.comboSlots.update((slots) => slots.map((slot, i) => (i === index ? { ...slot, isRequired: checked } : slot)));
  }

  protected addComboSlotOption(slotIndex: number): void {
    this.comboSlots.update((slots) =>
      slots.map((slot, i) => (i === slotIndex ? { ...slot, options: [...slot.options, emptyComboSlotOption()] } : slot)),
    );
  }

  protected removeComboSlotOption(slotIndex: number, optionIndex: number): void {
    this.comboSlots.update((slots) =>
      slots.map((slot, i) => (i === slotIndex ? { ...slot, options: slot.options.filter((_, j) => j !== optionIndex) } : slot)),
    );
  }

  protected updateComboSlotOptionProduct(slotIndex: number, optionIndex: number, restaurantProductId: string): void {
    this.comboSlots.update((slots) =>
      slots.map((slot, i) =>
        i === slotIndex
          ? { ...slot, options: slot.options.map((option, j) => (j === optionIndex ? { ...option, restaurantProductId } : option)) }
          : slot,
      ),
    );
  }

  protected updateComboSlotOptionPrice(slotIndex: number, optionIndex: number, priceEuros: string): void {
    this.comboSlots.update((slots) =>
      slots.map((slot, i) =>
        i === slotIndex
          ? { ...slot, options: slot.options.map((option, j) => (j === optionIndex ? { ...option, supplementPriceEuros: priceEuros } : option)) }
          : slot,
      ),
    );
  }

  protected setComboSlotOptionDefault(slotIndex: number, optionIndex: number): void {
    this.comboSlots.update((slots) =>
      slots.map((slot, i) =>
        i === slotIndex
          ? { ...slot, options: slot.options.map((option, j) => ({ ...option, isDefault: j === optionIndex })) }
          : slot,
      ),
    );
  }

  // ── Platter components ──────────────────────────────────────────────────────

  protected addPlatterComponent(): void {
    this.platterComponentDrafts.update((components) => [...components, emptyPlatterComponent()]);
  }

  protected removePlatterComponent(index: number): void {
    const component = this.platterComponentDrafts()[index];
    if (component?.id) this.deletedPlatterComponentIds.update((ids) => [...ids, component.id!]);
    this.platterComponentDrafts.update((components) => components.filter((_, i) => i !== index));
  }

  protected updatePlatterComponentField(
    index: number,
    field: 'name' | 'nameCa' | 'nameEn' | 'componentProductId' | 'quantity',
    value: string,
  ): void {
    this.platterComponentDrafts.update((components) => components.map((component, i) => (i === index ? { ...component, [field]: value } : component)));
  }

  protected togglePlatterComponentRemovable(index: number, checked: boolean): void {
    this.platterComponentDrafts.update((components) => components.map((component, i) => (i === index ? { ...component, isRemovable: checked } : component)));
  }

  protected togglePlatterComponentReplaceable(index: number, checked: boolean): void {
    this.platterComponentDrafts.update((components) => components.map((component, i) => (i === index ? { ...component, isReplaceable: checked } : component)));
  }

  private applyProduct(product: RestaurantProductDetailDto): void {
    this.name.set(product.name);
    this.nameCa.set(product.nameI18n?.ca ?? '');
    this.nameEn.set(product.nameI18n?.en ?? '');
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

  // `name` (castellano) sigue siendo obligatorio y canonico; CA/EN son opcionales y solo se
  // envian si hay algun valor, para no mandar `nameI18n: {}` cuando no se ha rellenado nada.
  private buildNameI18n(): { ca?: string; en?: string } | undefined {
    const ca = this.nameCa().trim();
    const en = this.nameEn().trim();
    if (!ca && !en) return undefined;
    return { ...(ca ? { ca } : {}), ...(en ? { en } : {}) };
  }

  protected save(): void {
    if (this.saveDisabled() || this.saving()) return;
    const name = this.name().trim();
    if (!name) return;
    const priceCents = Math.round(parseFloat(this.priceEuros().replace(',', '.') || '0') * 100);
    const nameI18n = this.buildNameI18n();

    this.saving.set(true);
    const existing = this.existingProduct();

    const req$: Observable<unknown> = existing
      ? this.upsertSupplementGroup$(existing.id, name).pipe(
          switchMap((supplementGroupId) =>
            this.menuApi.updateProduct(existing.id, {
              name,
              nameI18n,
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
          switchMap(() => (this.isCombo() || this.isPlatter() ? this.saveComboAndPlatterChanges$(existing.id) : of(undefined))),
        )
      : this.menuApi
          .createProduct({
            name,
            nameI18n,
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

  /**
   * Guarda combo slots / platter components tras el guardado principal del producto: crea los
   * nuevos (sin `id`), actualiza los existentes y borra los quitados de la lista. Las opciones de
   * un slot se reemplazan en bloque (así lo hace el backend), así que no hace falta diff a ese
   * nivel — ver Fase 1 Paso 2 del plan.
   */
  private saveComboAndPlatterChanges$(productId: string): Observable<unknown> {
    const calls: Observable<unknown>[] = [];

    if (this.isCombo()) {
      for (const slotId of this.deletedComboSlotIds()) {
        calls.push(this.menuApi.deleteComboSlot(productId, slotId));
      }
      for (const slot of this.comboSlots()) {
        const options = slot.options
          .filter((option) => option.restaurantProductId.trim().length > 0)
          .map((option) => ({
            restaurantProductId: option.restaurantProductId,
            supplementPriceCents: Math.round(parseFloat(option.supplementPriceEuros.replace(',', '.') || '0') * 100),
            isDefault: option.isDefault,
          }));
        if (options.length === 0) continue;

        const payload = {
          name: slot.name.trim(),
          nameI18n: this.buildSlotNameI18n(slot),
          minSelections: parseInt(slot.minSelections, 10) || 0,
          maxSelections: parseInt(slot.maxSelections, 10) || 1,
          isRequired: slot.isRequired,
          options,
        };
        if (!payload.name) continue;

        calls.push(
          slot.id
            ? this.menuApi.updateComboSlot(productId, slot.id, payload satisfies UpdateComboSlotRequest)
            : this.menuApi.createComboSlot(productId, payload satisfies CreateComboSlotRequest),
        );
      }
    }

    if (this.isPlatter()) {
      for (const componentId of this.deletedPlatterComponentIds()) {
        calls.push(this.menuApi.deletePlatterComponent(productId, componentId));
      }
      for (const component of this.platterComponentDrafts()) {
        const name = component.name.trim();
        if (!name) continue;

        const quantity = component.quantity.trim();
        const payload = {
          name,
          nameI18n: this.buildComponentNameI18n(component),
          isRemovable: component.isRemovable,
          isReplaceable: component.isReplaceable,
          // '' significa "no lo toques" al editar uno existente (no se puede precargar; ver
          // ComboOrPlatterMenuData). Al crear uno nuevo, en cambio, se envía tal cual (null si vacío).
          ...(component.componentProductId ? { componentProductId: component.componentProductId } : component.id ? {} : { componentProductId: null }),
          ...(quantity ? { quantity: parseInt(quantity, 10) } : component.id ? {} : { quantity: null }),
        };

        calls.push(
          component.id
            ? this.menuApi.updatePlatterComponent(productId, component.id, payload satisfies UpdatePlatterComponentRequest)
            : this.menuApi.createPlatterComponent(productId, payload satisfies CreatePlatterComponentRequest),
        );
      }
    }

    return calls.length > 0 ? forkJoin(calls) : of(undefined);
  }

  private buildSlotNameI18n(slot: ComboSlotDraft): { ca?: string; en?: string } | undefined {
    const ca = slot.nameCa.trim();
    const en = slot.nameEn.trim();
    if (!ca && !en) return undefined;
    return { ...(ca ? { ca } : {}), ...(en ? { en } : {}) };
  }

  private buildComponentNameI18n(component: PlatterComponentDraft): { ca?: string; en?: string } | undefined {
    const ca = component.nameCa.trim();
    const en = component.nameEn.trim();
    if (!ca && !en) return undefined;
    return { ...(ca ? { ca } : {}), ...(en ? { en } : {}) };
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
