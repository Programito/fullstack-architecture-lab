import type { Meta, StoryObj } from '@storybook/angular';
import { Breadcrumb, type BreadcrumbItem, type BreadcrumbSize } from './breadcrumb';

const items: BreadcrumbItem[] = [
  { label: 'Inicio', href: '#' },
  { label: 'Clientes' },
  { label: 'Acme', current: true },
];

type BreadcrumbStoryArgs = {
  items: BreadcrumbItem[];
  ariaLabel: string;
  size: BreadcrumbSize;
};

const meta: Meta<BreadcrumbStoryArgs> = {
  title: 'Shared UI/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  args: {
    items,
    ariaLabel: 'Miga de pan',
    size: 'md',
  },
  render: (args) => ({
    props: args,
    template: `
      <app-breadcrumb [items]="items" [ariaLabel]="ariaLabel" [size]="size" />
    `,
  }),
};

export default meta;

type Story = StoryObj<BreadcrumbStoryArgs>;

export const Default: Story = {};
export const CurrentPage: Story = { args: { items } };
export const DisabledItem: Story = {
  args: {
    items: [
      { label: 'Inicio', href: '#' },
      { label: 'Clientes', disabled: true },
      { label: 'Acme', current: true },
    ],
  },
};
export const Sizes: Story = {
  render: () => ({
    props: { items },
    template: `
      <div class="grid gap-4">
        <app-breadcrumb size="sm" [items]="items" />
        <app-breadcrumb [items]="items" />
        <app-breadcrumb size="lg" [items]="items" />
      </div>
    `,
  }),
};
