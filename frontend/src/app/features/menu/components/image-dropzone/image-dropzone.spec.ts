import { fireEvent, render, screen } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';

import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { ImageDropzone } from './image-dropzone';

describe('ImageDropzone', () => {
  const renderDropzone = async (componentProperties: Record<string, unknown> = {}) => {
    const i18n = provideI18nTesting('es');

    return render(
      '<app-image-dropzone [imageUrl]="imageUrl" [previewAlt]="previewAlt" [uploadStatus]="uploadStatus" [errorMessage]="errorMessage" (fileSelected)="fileSelected($event)" (removeRequested)="removeRequested()" (retryRequested)="retryRequested()" />',
      {
        imports: [...i18n.imports, ImageDropzone],
        providers: [...i18n.providers],
        componentProperties: {
          imageUrl: null,
          previewAlt: 'Imagen del producto',
          uploadStatus: 'idle',
          errorMessage: '',
          fileSelected: vi.fn(),
          removeRequested: vi.fn(),
          retryRequested: vi.fn(),
          ...componentProperties,
        },
      },
    );
  };

  it('shows the placeholder state when there is no image', async () => {
    await renderDropzone();

    expect(screen.getByText('Sin imagen')).toBeTruthy();
  });

  it('highlights the drop area on drag over', async () => {
    await renderDropzone();

    const dropArea = screen.getByText('Sin imagen').closest('.grid.rounded-md') as HTMLElement;
    fireEvent.dragOver(dropArea);

    expect(dropArea.className).toContain('border-cyan-500');
  });

  it('emits the dropped file on success', async () => {
    const fileSelected = vi.fn();
    await renderDropzone({ fileSelected });

    const dropArea = screen.getByText('Sin imagen').closest('.grid.rounded-md') as HTMLElement;
    const file = new File(['image'], 'burger.jpg', { type: 'image/jpeg' });
    fireEvent.drop(dropArea, { dataTransfer: { files: [file] } });

    expect(fileSelected).toHaveBeenCalledWith(file);
  });

  it('shows the provided validation error', async () => {
    await renderDropzone({ errorMessage: 'Solo JPG, PNG o WEBP' });

    expect(screen.getByText('Solo JPG, PNG o WEBP')).toBeTruthy();
  });

  it('emits the remove action', async () => {
    const removeRequested = vi.fn();
    await renderDropzone({
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/burger.jpg',
      removeRequested,
    });

    fireEvent.click(screen.getByRole('button', { name: /quitar/i }));

    expect(removeRequested).toHaveBeenCalled();
  });

  it('allows replacing the current image', async () => {
    const fileSelected = vi.fn();
    await renderDropzone({
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/burger.jpg',
      fileSelected,
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image'], 'replacement.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(fileSelected).toHaveBeenCalledWith(file);
    expect(screen.getByRole('button', { name: /reemplazar/i })).toBeTruthy();
  });

  it('shows the full preview image inside a taller frame', async () => {
    await renderDropzone({
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/burger.jpg',
    });

    const preview = screen.getByRole('img', { name: 'Imagen del producto' });
    expect(preview.className).toContain('object-contain');
    expect(preview.className).toContain('h-56');
  });

  it('uses two equal-width action columns when the preview already exists', async () => {
    await renderDropzone({
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/burger.jpg',
    });

    const replaceButton = screen.getByRole('button', { name: /reemplazar/i });
    const actionsGrid = replaceButton.parentElement as HTMLElement;

    expect(actionsGrid.className).toContain('sm:grid-cols-2');
    expect(replaceButton.className).toContain('w-full');
    expect(screen.getByRole('button', { name: /quitar/i }).className).toContain('w-full');
  });
});
