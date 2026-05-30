import type { Meta, StoryObj } from '@storybook/angular';
import {
  ReorderList,
  type ReorderListAppearance,
  type ReorderListItem,
  type ReorderListSize,
  type ReorderListVariant,
} from './reorder-list';

const value: ReorderListItem[] = [
  { id: 'overview', label: 'Resumen', description: 'Primera sección del informe', icon: 'dashboard' },
  { id: 'metrics', label: 'Métricas', description: 'Indicadores principales', icon: 'monitoring' },
  { id: 'activity', label: 'Actividad', description: 'Eventos recientes', icon: 'timeline' },
  { id: 'notes', label: 'Notas', description: 'Comentarios internos', icon: 'notes' },
];

type ReorderListStoryArgs = {
  label: string;
  hint: string;
  emptyText: string;
  value: ReorderListItem[];
  disabled: boolean;
  readonly: boolean;
  required: boolean;
  dragEnabled: boolean;
  showControls: boolean;
  variant: ReorderListVariant;
  appearance: ReorderListAppearance;
  size: ReorderListSize;
};

const meta: Meta<ReorderListStoryArgs> = {
  title: 'Shared UI/ReorderList',
  component: ReorderList,
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
    label: 'Secciones',
    hint: 'Arrastra o usa los botones para cambiar el orden.',
    emptyText: 'Sin elementos',
    value,
    disabled: false,
    readonly: false,
    required: false,
    dragEnabled: true,
    showControls: true,
    variant: 'primary',
    appearance: 'default',
    size: 'md',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-xl">
        <app-reorder-list
          [label]="label"
          [hint]="hint"
          [emptyText]="emptyText"
          [(value)]="value"
          [disabled]="disabled"
          [readonly]="readonly"
          [required]="required"
          [dragEnabled]="dragEnabled"
          [showControls]="showControls"
          [variant]="variant"
          [appearance]="appearance"
          [size]="size"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<ReorderListStoryArgs>;

export const Default: Story = {};
export const WithIcons: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Readonly: Story = { args: { readonly: true } };
export const ItemDisabled: Story = {
  args: {
    value: [
      value[0],
      { ...value[1], disabled: true, description: 'Esta sección queda fija' },
      value[2],
      value[3],
    ],
  },
};
export const WithoutDrag: Story = { args: { dragEnabled: false } };
export const WithoutControls: Story = { args: { showControls: false } };
export const Empty: Story = { args: { value: [] } };
export const Minimal: Story = { args: { appearance: 'minimal' } };
export const Sizes: Story = {
  render: () => ({
    props: { value },
    template: `
      <div class="grid max-w-xl gap-5">
        <app-reorder-list label="Pequeño" size="sm" [value]="value" />
        <app-reorder-list label="Mediano" [value]="value" />
        <app-reorder-list label="Grande" size="lg" [value]="value" />
      </div>
    `,
  }),
};
export const Variants: Story = {
  render: () => ({
    props: { value },
    template: `
      <div class="grid max-w-xl gap-5">
        <app-reorder-list label="Primary" variant="primary" [value]="value" />
        <app-reorder-list label="Secondary" variant="secondary" [value]="value" />
        <app-reorder-list label="Neutral" variant="neutral" [value]="value" />
        <app-reorder-list label="Danger" variant="danger" [value]="value" />
        <app-reorder-list label="Violet" variant="violet" [value]="value" />
      </div>
    `,
  }),
};
