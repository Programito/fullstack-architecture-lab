import { booleanAttribute, Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Icon } from '../../../../shared/ui/icon/icon';

export type ImageDropzoneUploadStatus = 'idle' | 'uploading' | 'failed';
export type ImageDropzoneSize = 'default' | 'compact';

@Component({
  selector: 'app-image-dropzone',
  imports: [Icon, TranslocoPipe],
  templateUrl: './image-dropzone.html',
})
export class ImageDropzone {
  readonly imageUrl = input<string | null>(null);
  readonly previewAlt = input('');
  readonly uploadStatus = input<ImageDropzoneUploadStatus>('idle');
  readonly errorMessage = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly accept = input('image/jpeg,image/png,image/webp');
  readonly inputLabel = input('menu.product.form.image');
  /** 'compact' renders a small thumbnail + buttons, for repeated rows (e.g. one per modifier option). */
  readonly size = input<ImageDropzoneSize>('default');

  readonly fileSelected = output<File>();
  readonly removeRequested = output<void>();
  readonly retryRequested = output<void>();

  protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  protected readonly isDragging = signal(false);

  protected readonly hasImage = computed(() => !!this.imageUrl());
  protected readonly canRetry = computed(() => this.uploadStatus() === 'failed' && !this.disabled());
  protected readonly canRemove = computed(() => this.hasImage() && !this.disabled() && this.uploadStatus() !== 'uploading');
  protected readonly canSelect = computed(() => !this.disabled() && this.uploadStatus() !== 'uploading');

  protected openFilePicker(): void {
    if (!this.canSelect()) {
      return;
    }

    this.fileInput()?.nativeElement.click();
  }

  protected handleDragOver(event: DragEvent): void {
    event.preventDefault();
    if (this.canSelect()) {
      this.isDragging.set(true);
    }
  }

  protected handleDragLeave(): void {
    this.isDragging.set(false);
  }

  protected handleDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);

    if (!this.canSelect()) {
      return;
    }

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }

  protected handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }

    if (input) {
      input.value = '';
    }
  }
}
