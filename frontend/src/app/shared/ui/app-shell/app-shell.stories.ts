import type { Meta, StoryObj } from '@storybook/angular';
import { AppShell, type AppShellAppearance, type AppShellSize, type AppShellVariant } from './app-shell';
import type { SideMenuGroup } from '../side-menu/side-menu';

const menuGroups: SideMenuGroup[] = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '#', icon: 'dashboard' },
      { id: 'clients', label: 'Clientes', href: '#', icon: 'groups', badge: '12' },
      { id: 'tasks', label: 'Tareas', href: '#', icon: 'checklist' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { id: 'reports', label: 'Informes', icon: 'analytics' },
      { id: 'settings', label: 'Ajustes', icon: 'settings' },
    ],
  },
];

type AppShellStoryArgs = {
  brand: string;
  brandHref: string;
  menuGroups: SideMenuGroup[];
  activeId: string;
  menuSticky: boolean;
  menuCollapsed: boolean;
  size: AppShellSize;
  variant: AppShellVariant;
  appearance: AppShellAppearance;
};

const meta: Meta<AppShellStoryArgs> = {
  title: 'Shared UI/AppShell',
  component: AppShell,
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
    menuGroups,
    activeId: 'dashboard',
    menuSticky: true,
    menuCollapsed: false,
    size: 'md',
    variant: 'primary',
    appearance: 'default',
  },
  render: (args) => ({
    props: args,
    template: `
      <app-app-shell
        [brand]="brand"
        [brandHref]="brandHref"
        [menuGroups]="menuGroups"
        [activeId]="activeId"
        [menuSticky]="menuSticky"
        [(menuCollapsed)]="menuCollapsed"
        [size]="size"
        [variant]="variant"
        [appearance]="appearance"
      >
        <section class="story-page">
          <h1>Dashboard</h1>
          <p>Vista de aplicacion con navegacion lateral y contenido principal.</p>
          <div class="story-grid">
            <article><strong>24</strong><span>Proyectos activos</span></article>
            <article><strong>8</strong><span>Tareas urgentes</span></article>
            <article><strong>91%</strong><span>Completado</span></article>
          </div>
        </section>
      </app-app-shell>
    `,
    styles: [
      `
        .story-page {
          display: grid;
          gap: 1rem;
        }

        .story-page h1,
        .story-page p {
          margin: 0;
        }

        .story-page p {
          color: var(--ui-muted-fg);
        }

        .story-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }

        .story-grid article {
          display: grid;
          gap: 0.25rem;
          border: 1px solid var(--ui-border);
          border-radius: 0.5rem;
          background: var(--ui-bg);
          padding: 1rem;
        }

        .story-grid strong {
          font-size: 1.5rem;
        }

        .story-grid span {
          color: var(--ui-muted-fg);
        }
      `,
    ],
  }),
};

export default meta;

type Story = StoryObj<AppShellStoryArgs>;

export const Default: Story = {};

export const CollapsedMenu: Story = {
  args: {
    menuCollapsed: true,
  },
};

export const StickyMenu: Story = {
  args: {
    menuSticky: true,
  },
};

export const ScrollableContent: Story = {
  render: (args) => ({
    props: { ...args, items: Array.from({ length: 18 }, (_, index) => index + 1) },
    template: `
      <app-app-shell [brand]="brand" [menuGroups]="menuGroups" [activeId]="activeId" [menuSticky]="menuSticky">
        <section class="story-page">
          <h1>Actividad</h1>
          <div class="story-feed">
            @for (item of items; track item) {
              <article>Actividad {{ item }}</article>
            }
          </div>
        </section>
      </app-app-shell>
    `,
    styles: [
      `
        .story-page { display: grid; gap: 1rem; }
        .story-page h1 { margin: 0; }
        .story-feed { display: grid; gap: 0.75rem; }
        .story-feed article {
          border: 1px solid var(--ui-border);
          border-radius: 0.5rem;
          background: var(--ui-bg);
          padding: 1rem;
        }
      `,
    ],
  }),
};

export const Responsive: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const WithBreadcrumb: Story = {
  render: (args) => ({
    props: args,
    template: `
      <app-app-shell [brand]="brand" [menuGroups]="menuGroups" activeId="clients">
        <div app-shell-navbar-center class="story-center">Clientes / Acme</div>
        <section class="story-page">
          <nav aria-label="Miga de pan" class="story-breadcrumb">
            <a href="#">Inicio</a>
            <span>/</span>
            <a href="#">Clientes</a>
            <span>/</span>
            <strong>Acme</strong>
          </nav>
          <h1>Acme</h1>
          <p>Contenido de una pantalla con contexto de navegacion.</p>
        </section>
      </app-app-shell>
    `,
    styles: [
      `
        .story-center,
        .story-breadcrumb,
        .story-page p {
          color: var(--ui-muted-fg);
        }

        .story-page {
          display: grid;
          gap: 1rem;
        }

        .story-page h1 {
          margin: 0;
        }

        .story-breadcrumb {
          display: flex;
          gap: 0.5rem;
        }
      `,
    ],
  }),
};

export const WithUserActions: Story = {
  render: (args) => ({
    props: args,
    template: `
      <app-app-shell [brand]="brand" [menuGroups]="menuGroups" [activeId]="activeId">
        <button app-shell-navbar-actions class="story-action" type="button">Crear</button>
        <span app-shell-navbar-user class="story-user">AT</span>
        <section class="story-page">
          <h1>Panel</h1>
          <p>Acciones y usuario proyectados en la barra superior.</p>
        </section>
      </app-app-shell>
    `,
    styles: [
      `
        .story-action {
          min-height: 2.25rem;
          border: 1px solid var(--ui-border);
          border-radius: 0.5rem;
          background: var(--ui-bg);
          color: var(--ui-fg);
          padding: 0 0.75rem;
        }

        .story-user {
          display: inline-grid;
          width: 2.25rem;
          height: 2.25rem;
          place-items: center;
          border-radius: 999px;
          background: var(--ui-bg);
          font-weight: 700;
        }

        .story-page h1,
        .story-page p {
          margin: 0;
        }
      `,
    ],
  }),
};
