import { describe, expect, it, vi } from 'vitest';

import {
  constrainImageDimensions,
  prepareImageFile,
  validateImageFile,
} from './image-upload.utils';

describe('image-upload.utils', () => {
  it('accepts supported image files within the max size', () => {
    const file = new File(['ok'], 'burger.jpg', { type: 'image/jpeg' });

    expect(validateImageFile(file, { maxFileSizeBytes: 1024 })).toBeNull();
  });

  it('rejects files with unsupported MIME types', () => {
    const file = new File(['svg'], 'burger.svg', { type: 'image/svg+xml' });

    expect(validateImageFile(file)).toEqual({ reason: 'invalid-type' });
  });

  it('rejects files larger than the configured limit', () => {
    const file = new File([new Uint8Array(16)], 'burger.png', { type: 'image/png' });

    expect(validateImageFile(file, { maxFileSizeBytes: 4 })).toEqual({ reason: 'file-too-large' });
  });

  it('constrains resize targets while preserving aspect ratio', () => {
    expect(constrainImageDimensions(2400, 1200, 1600, 1600)).toEqual({ width: 1600, height: 800 });
    expect(constrainImageDimensions(1200, 2400, 1600, 1600)).toEqual({ width: 800, height: 1600 });
    expect(constrainImageDimensions(1200, 800, 1600, 1600)).toEqual({ width: 1200, height: 800 });
  });

  it('rejects images smaller than the minimum dimensions before upload', async () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const originalImage = globalThis.Image;
    class FakeImage {
      naturalWidth = 300;
      naturalHeight = 200;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    // @ts-expect-error test double
    globalThis.Image = FakeImage;

    const file = new File(['tiny'], 'tiny.jpg', { type: 'image/jpeg' });

    await expect(
      prepareImageFile(file, { minWidth: 400, minHeight: 300, maxFileSizeBytes: 1024 }),
    ).rejects.toEqual({
      reason: 'image-too-small',
      details: { minimumWidth: 400, minimumHeight: 300 },
    });

    globalThis.Image = originalImage;
    createObjectUrl.mockRestore();
    revokeObjectUrl.mockRestore();
  });
});
