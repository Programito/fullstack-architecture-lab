import type { Meta, StoryObj } from '@storybook/angular';
import { SideMenu, type SideMenuAppearance, type SideMenuGroup, type SideMenuSize, type SideMenuVariant } from './side-menu';

const groups: SideMenuGroup[] = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '#', icon: 'dashboard' },
      { id: 'clients', label: 'Clientes', href: '#', icon: 'groups', badge: '12' },
      { id: 'projects', label: 'Proyectos', icon: 'folder', children: [{ id: 'active', label: 'Activos', href: '#', icon: 'task_alt' }] },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'settings', label: 'Ajustes', icon: 'settings' },
      { id: 'billing', label: 'Facturacion', href: '#', icon: 'credit_card' },
    ],
  },
];

type SideMenuStoryArgs = {
  groups: SideMenuGroup[];
  ariaLabel: string;
  collapsible: boolean;
  sticky: boolean;
  disabled: boolean;
  collapsed: boolean;
  activeId: string;
  size: SideMenuSize;
  variant: SideMenuVariant;
  appearance: SideMenuAppearance;
};

const meta: Meta<SideMenuStoryArgs> = {
  title: 'Shared UI/SideMenu',
  component: SideMenu,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
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
    groups,
    ariaLabel: 'Navegacion lateral',
    collapsible: true,
    sticky: true,
    disabled: false,
    collapsed: false,
    activeId: 'dashboard',
    size: 'md',
    variant: 'primary',
    appearance: 'default',
  },
  render: (args) => ({
    props: args,
    template: `
      <app-side-menu
        [groups]="groups"
        [ariaLabel]="ariaLabel"
        [collapsible]="collapsible"
        [sticky]="sticky"
        [disabled]="disabled"
        [(collapsed)]="collapsed"
        [(activeId)]="activeId"
        [size]="size"
        [variant]="variant"
        [appearance]="appearance"
      />
    `,
  }),
};

export default meta;

type Story = StoryObj<SideMenuStoryArgs>;

export const Default: Story = {};

export const WithGroups: Story = {};

export const Collapsed: Story = {
  args: {
    collapsed: true,
  },
};

export const ActiveItem: Story = {
  args: {
    activeId: 'clients',
  },
};

export const DisabledItem: Story = {
  args: {
    groups: [
      {
        label: 'Principal',
        items: [
          { id: 'dashboard', label: 'Dashboard', href: '#', icon: 'dashboard' },
          { id: 'clients', label: 'Clientes', href: '#', icon: 'groups', disabled: true },
        ],
      },
    ],
  },
};

export const Sticky: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="height: 22rem; overflow: auto; border: 1px solid var(--ui-border);">
        <div style="display: flex; min-height: 44rem;">
          <app-side-menu [groups]="groups" [(activeId)]="activeId" sticky />
          <div style="padding: 1rem; color: var(--ui-muted-fg);">Contenido con scroll</div>
        </div>
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    props: { groups },
    template: `
      <div style="display: flex; gap: 1rem; align-items: flex-start;">
        <app-side-menu size="sm" [groups]="groups" activeId="dashboard" />
        <app-side-menu [groups]="groups" activeId="dashboard" />
        <app-side-menu size="lg" [groups]="groups" activeId="dashboard" />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    props: { groups },
    template: `
      <div class="grid gap-4">
        <app-side-menu variant="primary" [groups]="groups" activeId="dashboard" />
        <app-side-menu variant="secondary" [groups]="groups" activeId="dashboard" />
        <app-side-menu variant="neutral" [groups]="groups" activeId="dashboard" />
        <app-side-menu variant="danger" [groups]="groups" activeId="dashboard" />
        <app-side-menu variant="violet" [groups]="groups" activeId="dashboard" />
      </div>
    `,
  }),
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
  },
};
