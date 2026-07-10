import type { Meta, StoryObj } from '@storybook/angular';
import { ImageDropzone, type ImageDropzoneSize, type ImageDropzoneUploadStatus } from './image-dropzone';

type Args = {
  imageUrl: string | null;
  previewAlt: string;
  uploadStatus: ImageDropzoneUploadStatus;
  errorMessage: string | null;
  disabled: boolean;
  size: ImageDropzoneSize;
};

const meta: Meta<Args> = {
  title: 'Menu/Image Dropzone',
  component: ImageDropzone,
  tags: ['autodocs'],
  argTypes: {
    uploadStatus: {
      control: 'inline-radio',
      options: ['idle', 'uploading', 'failed'],
    },
  },
  args: {
    imageUrl: null,
    previewAlt: 'Hamburguesa craft',
    uploadStatus: 'idle',
    errorMessage: null,
    disabled: false,
    size: 'default',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-sm">
        <app-image-dropzone
          [imageUrl]="imageUrl"
          [previewAlt]="previewAlt"
          [uploadStatus]="uploadStatus"
          [errorMessage]="errorMessage"
          [disabled]="disabled"
          [size]="size"
        />
      </div>
    `,
  }),
};

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const WithImage: Story = {
  args: {
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/docs/models.jpg',
    previewAlt: 'Hamburguesa craft',
  },
};

export const Uploading: Story = {
  args: {
    uploadStatus: 'uploading',
  },
};

export const UploadFailed: Story = {
  args: {
    uploadStatus: 'failed',
    errorMessage: 'No se pudo subir la imagen. Inténtalo de nuevo.',
  },
};

export const InvalidType: Story = {
  args: {
    uploadStatus: 'failed',
    errorMessage: 'Usa una imagen JPG, PNG o WEBP.',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DisabledWithImage: Story = {
  args: {
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/docs/models.jpg',
    previewAlt: 'Hamburguesa craft',
    disabled: true,
  },
};

export const Compact: Story = {
  args: {
    size: 'compact',
  },
};

export const CompactWithImage: Story = {
  args: {
    size: 'compact',
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/docs/models.jpg',
    previewAlt: 'Queso extra',
  },
};

export const Locales: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-sm gap-6">
        <app-image-dropzone previewAlt="Burger" />
      </div>
    `,
  }),
  globals: { locale: 'es' },
};

export const LocaleEnglish: Story = {
  name: 'Locale: English',
  render: () => ({
    template: `<div class="max-w-sm"><app-image-dropzone previewAlt="Burger" /></div>`,
  }),
  globals: { locale: 'en' },
};

export const LocaleCatalan: Story = {
  name: 'Locale: Català',
  render: () => ({
    template: `<div class="max-w-sm"><app-image-dropzone previewAlt="Hamburguesa" /></div>`,
  }),
  globals: { locale: 'ca' },
};
