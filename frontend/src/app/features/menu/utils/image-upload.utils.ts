export const DEFAULT_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const DEFAULT_MAX_IMAGE_FILE_SIZE_BYTES = 8 * 1024 * 1024;
export const DEFAULT_MIN_IMAGE_WIDTH = 480;
export const DEFAULT_MIN_IMAGE_HEIGHT = 320;
export const DEFAULT_MAX_IMAGE_WIDTH = 1600;
export const DEFAULT_MAX_IMAGE_HEIGHT = 1600;
export const DEFAULT_IMAGE_QUALITY = 0.86;

export type ImageValidationErrorReason = 'invalid-type' | 'file-too-large' | 'image-too-small';

export type ImageValidationError = {
  reason: ImageValidationErrorReason;
  details?: { minimumWidth?: number; minimumHeight?: number };
};

export type ImageDimensions = { width: number; height: number };

export type ValidateImageFileOptions = {
  allowedTypes?: readonly string[];
  maxFileSizeBytes?: number;
};

export type PrepareImageFileOptions = ValidateImageFileOptions & {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

export function validateImageFile(
  file: File,
  options: ValidateImageFileOptions = {},
): ImageValidationError | null {
  const allowedTypes = options.allowedTypes ?? DEFAULT_ALLOWED_IMAGE_TYPES;
  const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_IMAGE_FILE_SIZE_BYTES;

  if (!allowedTypes.includes(file.type)) {
    return { reason: 'invalid-type' };
  }

  if (file.size > maxFileSizeBytes) {
    return { reason: 'file-too-large' };
  }

  return null;
}

export function constrainImageDimensions(
  width: number,
  height: number,
  maxWidth = DEFAULT_MAX_IMAGE_WIDTH,
  maxHeight = DEFAULT_MAX_IMAGE_HEIGHT,
): ImageDimensions {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const scale = Math.min(widthRatio, heightRatio);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function prepareImageFile(
  file: File,
  options: PrepareImageFileOptions = {},
): Promise<File> {
  const basicValidation = validateImageFile(file, options);
  if (basicValidation) {
    throw basicValidation;
  }

  const minWidth = options.minWidth ?? DEFAULT_MIN_IMAGE_WIDTH;
  const minHeight = options.minHeight ?? DEFAULT_MIN_IMAGE_HEIGHT;
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_IMAGE_WIDTH;
  const maxHeight = options.maxHeight ?? DEFAULT_MAX_IMAGE_HEIGHT;
  const quality = options.quality ?? DEFAULT_IMAGE_QUALITY;

  const dimensions = await readImageDimensions(file);
  if (dimensions.width < minWidth || dimensions.height < minHeight) {
    throw {
      reason: 'image-too-small',
      details: { minimumWidth: minWidth, minimumHeight: minHeight },
    } satisfies ImageValidationError;
  }

  const target = constrainImageDimensions(dimensions.width, dimensions.height, maxWidth, maxHeight);
  if (target.width === dimensions.width && target.height === dimensions.height) {
    return file;
  }

  return resizeImageFile(file, target, quality);
}

export function readImageDimensions(file: Blob): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read image dimensions'));
    };

    image.src = url;
  });
}

async function resizeImageFile(
  file: File,
  target: ImageDimensions,
  quality: number,
): Promise<File> {
  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to resize image');
  }

  context.drawImage(image, 0, 0, target.width, target.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Unable to export resized image'));
          return;
        }

        resolve(result);
      },
      file.type,
      quality,
    );
  });

  return new File([blob], file.name, {
    type: blob.type || file.type,
    lastModified: Date.now(),
  });
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to load image for resize'));
    };

    image.src = url;
  });
}
