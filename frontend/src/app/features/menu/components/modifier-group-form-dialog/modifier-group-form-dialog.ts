import { booleanAttribute, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Input } from '../../../../shared/ui/input/input';
import { Select, type SelectOption } from '../../../../shared/ui/select/select';
import { Switch } from '../../../../shared/ui/switch/switch';
import { ImageDropzone } from '../image-dropzone/image-dropzone';
import type { ModifierGroup } from '../../models/modifier-group.model';
import type { CreateModifierGroupRequest } from '../../services/menu-api.service';
import {
  ProductImageUploadError,
  ProductImageUploadService,
} from '../../services/product-image-upload.service';

type OptionUploadStatus = 'idle' | 'uploading' | 'failed';

export type ModifierGroupOptionDraft = {
  name: string;
  // CA/EN opcionales junto al nombre canonico en castellano (name). Ver
  // docs/superpowers/plans/2026-07-11-menu-multilingual-names.md.
  nameCa: string;
  nameEn: string;
  priceDeltaCents: number;
  imageUrl: string | null;
  uploadStatus: OptionUploadStatus;
  imageErrorMessage: string | null;
};

function emptyOption(): ModifierGroupOptionDraft {
  return { name: '', nameCa: '', nameEn: '', priceDeltaCents: 0, imageUrl: null, uploadStatus: 'idle', imageErrorMessage: null };
}

@Component({
  selector: 'app-modifier-group-form-dialog',
  imports: [Button, Dialog, Icon, ImageDropzone, Input, Select, Switch, TranslocoPipe],
  templateUrl: './modifier-group-form-dialog.html',
})
export class ModifierGroupFormDialog {
  readonly open = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  // Grupo a editar (null = modo creación). Al abrir con un valor no nulo, el effect() de abajo
  // precarga todos los campos desde ese grupo en vez de resetearlos a vacío — ver
  // docs/superpowers/plans/2026-07-11-menu-multilingual-names.md, Fase 2 Paso 3 (hueco resuelto).
  readonly editingGroup = input<ModifierGroup | null>(null);
  readonly closed = output<void>();
  readonly confirmed = output<CreateModifierGroupRequest>();

  private readonly transloco = inject(TranslocoService);
  private readonly imageUpload = inject(ProductImageUploadService);

  protected readonly isEdit = computed(() => this.editingGroup() !== null);
  protected readonly dialogTitle = computed(() =>
    this.transloco.translate(this.isEdit() ? 'menu.modifierGroup.form.editTitle' : 'menu.modifierGroup.form.createTitle'),
  );
  protected readonly confirmButtonLabel = computed(() =>
    this.transloco.translate(this.isEdit() ? 'menu.modifierGroup.form.save' : 'menu.modifierGroup.form.create'),
  );

  protected readonly name = signal('');
  // CA/EN opcionales junto al nombre canonico en castellano (name).
  protected readonly nameCa = signal('');
  protected readonly nameEn = signal('');
  protected readonly selectionType = signal<'single' | 'multiple'>('single');
  protected readonly isRequired = signal(false);
  protected readonly options = signal<ModifierGroupOptionDraft[]>([emptyOption()]);

  /** Files kept per option row so "reintentar" can re-upload without asking again. Not reactive on purpose. */
  private readonly pendingRetryFiles = new Map<number, File>();

  protected readonly selectionTypeOptions: SelectOption[] = [
    { value: 'single', label: 'Una opción' },
    { value: 'multiple', label: 'Varias opciones' },
  ];

  protected readonly isValid = computed(() => {
    const nameOk = this.name().trim().length > 0;
    const optionsOk = this.options().length > 0 && this.options().every((o) => o.name.trim().length > 0);
    const noUploadInFlight = this.options().every((o) => o.uploadStatus !== 'uploading');
    return nameOk && optionsOk && noUploadInFlight;
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const editing = this.editingGroup();
      this.pendingRetryFiles.clear();

      if (editing) {
        this.name.set(editing.name);
        this.nameCa.set(editing.nameI18n?.ca ?? '');
        this.nameEn.set(editing.nameI18n?.en ?? '');
        // El diálogo solo distingue single/multiple; un grupo 'remove' (fuera del alcance de
        // creación de este diálogo) se trata como 'multiple' si alguna vez llega aquí a editar.
        this.selectionType.set(editing.type === 'single' ? 'single' : 'multiple');
        this.isRequired.set(editing.required);
        this.options.set(
          editing.options.length > 0
            ? editing.options.map((option) => ({
                name: option.name,
                nameCa: option.nameI18n?.ca ?? '',
                nameEn: option.nameI18n?.en ?? '',
                priceDeltaCents: Math.round(option.priceDelta * 100),
                imageUrl: option.imageUrl ?? null,
                uploadStatus: 'idle' as OptionUploadStatus,
                imageErrorMessage: null,
              }))
            : [emptyOption()],
        );
      } else {
        this.name.set('');
        this.nameCa.set('');
        this.nameEn.set('');
        this.selectionType.set('single');
        this.isRequired.set(false);
        this.options.set([emptyOption()]);
      }
    });
  }

  protected addOption(): void {
    this.options.update((opts) => [...opts, emptyOption()]);
  }

  protected removeOption(index: number): void {
    this.options.update((opts) => opts.filter((_, i) => i !== index));
    this.pendingRetryFiles.delete(index);
  }

  protected moveOption(index: number, delta: -1 | 1): void {
    this.options.update((opts) => {
      const target = index + delta;
      if (target < 0 || target >= opts.length) return opts;
      const next = [...opts];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    const fileA = this.pendingRetryFiles.get(index);
    const fileB = this.pendingRetryFiles.get(index + delta);
    if (fileB !== undefined) this.pendingRetryFiles.set(index, fileB); else this.pendingRetryFiles.delete(index);
    if (fileA !== undefined) this.pendingRetryFiles.set(index + delta, fileA); else this.pendingRetryFiles.delete(index + delta);
  }

  protected updateOptionName(index: number, value: string): void {
    this.options.update((opts) => opts.map((opt, i) => (i === index ? { ...opt, name: value } : opt)));
  }

  protected updateOptionNameCa(index: number, value: string): void {
    this.options.update((opts) => opts.map((opt, i) => (i === index ? { ...opt, nameCa: value } : opt)));
  }

  protected updateOptionNameEn(index: number, value: string): void {
    this.options.update((opts) => opts.map((opt, i) => (i === index ? { ...opt, nameEn: value } : opt)));
  }

  protected updateOptionPrice(index: number, raw: string): void {
    const euros = parseFloat(raw.replace(',', '.') || '0');
    const cents = isNaN(euros) ? 0 : Math.round(euros * 100);
    this.options.update((opts) => opts.map((opt, i) => (i === index ? { ...opt, priceDeltaCents: cents } : opt)));
  }

  protected handleOptionFileSelected(index: number, file: File): void {
    this.pendingRetryFiles.set(index, file);
    this.uploadOptionImage(index, file);
  }

  protected handleOptionRetryUpload(index: number): void {
    const file = this.pendingRetryFiles.get(index);
    if (!file || this.options()[index]?.uploadStatus === 'uploading') {
      return;
    }

    this.uploadOptionImage(index, file);
  }

  protected handleOptionRemoveImage(index: number): void {
    this.options.update((opts) =>
      opts.map((opt, i) => (i === index ? { ...opt, imageUrl: null, uploadStatus: 'idle', imageErrorMessage: null } : opt)),
    );
    this.pendingRetryFiles.delete(index);
  }

  private uploadOptionImage(index: number, file: File): void {
    this.options.update((opts) =>
      opts.map((opt, i) => (i === index ? { ...opt, uploadStatus: 'uploading', imageErrorMessage: null } : opt)),
    );

    this.imageUpload.uploadProductImage(file, 'modifier-options').subscribe({
      next: (uploadedUrl) => {
        this.options.update((opts) =>
          opts.map((opt, i) =>
            i === index ? { ...opt, imageUrl: uploadedUrl, uploadStatus: 'idle', imageErrorMessage: null } : opt,
          ),
        );
        this.pendingRetryFiles.delete(index);
      },
      error: (error: unknown) => {
        this.options.update((opts) =>
          opts.map((opt, i) =>
            i === index ? { ...opt, uploadStatus: 'failed', imageErrorMessage: this.mapUploadErrorToMessage(error) } : opt,
          ),
        );
      },
    });
  }

  private buildNameI18n(ca: string, en: string): { ca?: string; en?: string } | undefined {
    const trimmedCa = ca.trim();
    const trimmedEn = en.trim();
    if (!trimmedCa && !trimmedEn) return undefined;
    return { ...(trimmedCa ? { ca: trimmedCa } : {}), ...(trimmedEn ? { en: trimmedEn } : {}) };
  }

  protected handleConfirm(): void {
    if (!this.isValid() || this.loading()) return;
    const type = this.selectionType();
    this.confirmed.emit({
      name: this.name().trim(),
      nameI18n: this.buildNameI18n(this.nameCa(), this.nameEn()),
      selectionType: type,
      minSelections: this.isRequired() ? 1 : 0,
      maxSelections: type === 'single' ? 1 : this.options().length,
      isRequired: this.isRequired(),
      options: this.options().map((o) => ({
        name: o.name.trim(),
        nameI18n: this.buildNameI18n(o.nameCa, o.nameEn),
        priceDeltaCents: o.priceDeltaCents,
        ...(o.imageUrl ? { imageUrl: o.imageUrl } : {}),
      })),
    });
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
