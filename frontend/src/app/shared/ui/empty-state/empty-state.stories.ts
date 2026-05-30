import type { Meta, StoryObj } from '@storybook/angular';
import { EmptyState, type EmptyStateAppearance, type EmptyStateSize } from './empty-state';

type EmptyStateStoryArgs = {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  secondaryActionLabel: string;
  size: EmptyStateSize;
  appearance: EmptyStateAppearance;
};

const meta: Meta<EmptyStateStoryArgs> = {
  title: 'Shared UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    appearance: {
      control: 'select',
      options: ['default', 'minimal', 'danger'],
    },
  },
  args: {
    icon: 'inbox',
    title: 'No hay resultados',
    description: 'Prueba con otros filtros o crea un nuevo registro.',
    actionLabel: 'Crear registro',
    secondaryActionLabel: '',
    size: 'md',
    appearance: 'default',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-xl">
        <app-empty-state
          [icon]="icon"
          [title]="title"
          [description]="description"
          [actionLabel]="actionLabel"
          [secondaryActionLabel]="secondaryActionLabel"
          [size]="size"
          [appearance]="appearance"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<EmptyStateStoryArgs>;

export const Default: Story = {};
export const SearchEmpty: Story = { args: { icon: 'search_off', title: 'Sin coincidencias', actionLabel: '', description: 'Ajusta la busqueda o elimina algun filtro.' } };
export const Danger: Story = { args: { icon: 'error', title: 'No se pudo cargar', appearance: 'danger', actionLabel: 'Reintentar' } };
export const WithActions: Story = { args: { actionLabel: 'Crear', secondaryActionLabel: 'Limpiar filtros' } };
export const Compact: Story = { args: { size: 'sm', appearance: 'minimal', actionLabel: '' } };
export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-xl gap-4">
        <app-empty-state size="sm" title="Pequeno" description="Estado compacto." />
        <app-empty-state title="Mediano" description="Estado por defecto." />
        <app-empty-state size="lg" title="Grande" description="Estado con mas presencia." />
      </div>
    `,
  }),
};
