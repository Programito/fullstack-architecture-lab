import type { Meta, StoryObj } from '@storybook/angular';
import { Navbar, type NavbarAppearance, type NavbarSize, type NavbarVariant } from './navbar';

type NavbarStoryArgs = {
  brand: string;
  brandHref: string;
  ariaLabel: string;
  size: NavbarSize;
  variant: NavbarVariant;
  appearance: NavbarAppearance;
  sticky: boolean;
};

const meta: Meta<NavbarStoryArgs> = {
  title: 'Shared UI/Navbar',
  component: Navbar,
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
    brand: 'Producto',
    brandHref: '#',
    ariaLabel: 'Navegacion principal',
    size: 'md',
    variant: 'primary',
    appearance: 'default',
    sticky: false,
  },
  render: (args) => ({
    props: args,
    template: `
      <app-navbar
        [brand]="brand"
        [brandHref]="brandHref"
        [ariaLabel]="ariaLabel"
        [size]="size"
        [variant]="variant"
        [appearance]="appearance"
        [sticky]="sticky"
      />
    `,
  }),
};

export default meta;

type Story = StoryObj<NavbarStoryArgs>;

export const Default: Story = {};

export const WithActions: Story = {
  render: (args) => ({
    props: args,
    template: `
      <app-navbar [brand]="brand" [brandHref]="brandHref" [variant]="variant">
        <button navbar-actions class="story-action" type="button">Invitar</button>
        <button navbar-actions class="story-icon-action" type="button" aria-label="Notificaciones">notifications</button>
        <span navbar-user class="story-user">AT</span>
      </app-navbar>
    `,
    styles: [
      `
        .story-action,
        .story-icon-action {
          min-height: 2.25rem;
          border: 1px solid var(--ui-border);
          border-radius: 0.5rem;
          background: var(--ui-bg);
          color: var(--ui-fg);
          padding: 0 0.75rem;
        }

        .story-icon-action {
          width: 2.25rem;
          padding: 0;
          font-family: "Material Symbols Rounded";
          font-size: 1.25rem;
        }

        .story-user {
          display: inline-grid;
          width: 2.25rem;
          height: 2.25rem;
          place-items: center;
          border-radius: 999px;
          background: var(--ui-surface);
          font-weight: 700;
        }
      `,
    ],
  }),
};

export const WithSearch: Story = {
  render: (args) => ({
    props: args,
    template: `
      <app-navbar [brand]="brand" [brandHref]="brandHref">
        <form navbar-center class="story-search" role="search">
          <input aria-label="Buscar" placeholder="Buscar" />
        </form>
        <button navbar-actions class="story-action" type="button">Crear</button>
      </app-navbar>
    `,
    styles: [
      `
        .story-search input {
          width: min(28rem, 52vw);
          min-height: 2.5rem;
          border: 1px solid var(--ui-border);
          border-radius: 0.5rem;
          background: var(--ui-bg);
          color: var(--ui-fg);
          padding: 0 0.75rem;
        }

        .story-action {
          min-height: 2.25rem;
          border: 1px solid var(--ui-border);
          border-radius: 0.5rem;
          background: var(--ui-bg);
          color: var(--ui-fg);
          padding: 0 0.75rem;
        }
      `,
    ],
  }),
};

export const Sticky: Story = {
  args: {
    sticky: true,
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="height: 18rem; overflow: auto; border: 1px solid var(--ui-border);">
        <app-navbar [brand]="brand" [brandHref]="brandHref" sticky />
        <div style="height: 32rem; padding: 1rem; color: var(--ui-muted-fg);">Contenido con scroll</div>
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="grid gap-4">
        <app-navbar brand="Pequeno" size="sm" />
        <app-navbar brand="Mediano" />
        <app-navbar brand="Grande" size="lg" />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    template: `
      <div class="grid gap-4">
        <app-navbar brand="Primary" variant="primary" />
        <app-navbar brand="Secondary" variant="secondary" />
        <app-navbar brand="Neutral" variant="neutral" />
        <app-navbar brand="Danger" variant="danger" />
        <app-navbar brand="Violet" variant="violet" />
      </div>
    `,
  }),
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
  },
};
