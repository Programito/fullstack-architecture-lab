import { booleanAttribute, Component, computed, input, model, output } from '@angular/core';
import { FormField, type FormFieldSize } from '../form-field/form-field';
import { Icon } from '../icon/icon';

export type FileUploadAppearance = 'default' | 'minimal';
export type FileUploadSize = FormFieldSize;
export type FileUploadVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'violet';
export type FileRejectReason = 'max-files' | 'max-size' | 'accept';
export type FileReject = { file: File; reason: FileRejectReason };

@Component({
  selector: 'app-file-upload',
  imports: [FormField, Icon],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.css',
  host: {
    '[attr.id]': 'null',
  },
})
export class FileUpload {
  readonly label = input('Archivos');
  readonly hint = input('');
  readonly error = input('');
  readonly accept = input('');
  readonly maxFiles = input<number | null>(null);
  readonly maxSize = input<number | null>(null);
  readonly variant = input<FileUploadVariant>('primary');
  readonly appearance = input<FileUploadAppearance>('default');
  readonly size = input<FileUploadSize>('md');
  readonly multiple = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });

  readonly files = model<File[]>([]);
  readonly rejected = output<FileReject>();

  private readonly generatedId = `file-upload-${crypto.randomUUID()}`;

  protected readonly inputId = this.generatedId;
  protected readonly describedBy = computed(() => {
    if (this.error()) {
      return `${this.inputId}-error`;
    }

    return this.hint() ? `${this.inputId}-hint` : null;
  });

  protected readonly classes = computed(() =>
    [
      'file-upload',
      `file-upload--${this.size()}`,
      `file-upload--${this.appearance()}`,
      `file-upload--${this.variant()}`,
      this.error() ? 'file-upload--error' : '',
      this.disabled() ? 'file-upload--disabled' : '',
    ].join(' '),
  );

  protected handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.addFiles(Array.from(target.files ?? []));
    target.value = '';
  }

  protected handleDrop(event: DragEvent): void {
    event.preventDefault();

    if (!this.disabled()) {
      this.addFiles(Array.from(event.dataTransfer?.files ?? []));
    }
  }

  protected removeFile(file: File): void {
    this.files.set(this.files().filter((currentFile) => currentFile !== file));
  }

  protected clearFiles(): void {
    this.files.set([]);
  }

  protected formatSize(file: File): string {
    if (file.size < 1024 * 1024) {
      return `${Math.max(1, Math.round(file.size / 1024))} KB`;
    }

    return `${(file.size / 1024 / 1024).toFixed(1)} MB`;
  }

  private addFiles(nextFiles: File[]): void {
    if (this.disabled()) {
      return;
    }

    const acceptedFiles = [...this.files()];

    for (const file of nextFiles) {
      const reason = this.getRejectReason(file, acceptedFiles.length);

      if (reason) {
        this.rejected.emit({ file, reason });
      } else {
        acceptedFiles.push(file);
      }
    }

    this.files.set(this.multiple() ? acceptedFiles : acceptedFiles.slice(-1));
  }

  private getRejectReason(file: File, currentCount: number): FileRejectReason | null {
    const maxFiles = this.maxFiles();
    const maxSize = this.maxSize();

    if (maxFiles !== null && currentCount >= maxFiles) {
      return 'max-files';
    }

    if (maxSize !== null && file.size > maxSize) {
      return 'max-size';
    }

    if (this.accept() && !matchesAccept(file, this.accept())) {
      return 'accept';
    }

    return null;
  }
}

function matchesAccept(file: File, accept: string): boolean {
  return accept
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .some((item) => {
      if (item.endsWith('/*')) {
        return file.type.startsWith(item.slice(0, -1));
      }

      if (item.startsWith('.')) {
        return file.name.toLocaleLowerCase().endsWith(item.toLocaleLowerCase());
      }

      return file.type === item;
    });
}
