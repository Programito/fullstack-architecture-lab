import type { Meta, StoryObj } from '@storybook/angular';
import { FileUpload, type FileUploadAppearance, type FileUploadVariant } from './file-upload';

type Args = {
  label: string;
  hint: string;
  error: string;
  accept: string;
  maxFiles: number | null;
  maxSize: number | null;
  variant: FileUploadVariant;
  appearance: FileUploadAppearance;
  multiple: boolean;
  disabled: boolean;
  required: boolean;
};

const meta: Meta<Args> = {
  title: 'Shared UI/File Upload',
  component: FileUpload,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'neutral', 'danger', 'violet'],
    },
    appearance: {
      control: 'select',
      options: ['default', 'minimal'],
    },
  },
  args: {
    label: 'Documentos',
    hint: 'Sube archivos necesarios para continuar.',
    error: '',
    accept: '',
    maxFiles: null,
    maxSize: null,
    variant: 'primary',
    appearance: 'default',
    multiple: false,
    disabled: false,
    required: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-md">
        <app-file-upload
          [label]="label"
          [hint]="hint"
          [error]="error"
          [accept]="accept"
          [maxFiles]="maxFiles"
          [maxSize]="maxSize"
          [variant]="variant"
          [appearance]="appearance"
          [multiple]="multiple"
          [disabled]="disabled"
          [required]="required"
        />
      </div>
    `,
  }),
};

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};
export const Multiple: Story = { args: { multiple: true, maxFiles: 3 } };
export const AcceptImages: Story = { args: { accept: 'image/*', hint: 'Solo imagenes.' } };
export const MaxSize: Story = { args: { maxSize: 1024 * 1024, hint: 'Maximo 1 MB.' } };
export const Disabled: Story = { args: { disabled: true } };
export const Error: Story = { args: { hint: '', error: 'El archivo no es valido.' } };
export const SelectedFiles: Story = {
  render: () => ({
    props: {
      files: [new File(['contenido'], 'contrato.pdf', { type: 'application/pdf' })],
    },
    template: '<div class="max-w-md"><app-file-upload label="Documentos" [files]="files" /></div>',
  }),
};
