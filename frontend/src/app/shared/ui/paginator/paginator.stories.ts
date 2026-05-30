import type { Meta, StoryObj } from '@storybook/angular';
import { Paginator, type PaginatorAppearance, type PaginatorSize, type PaginatorVariant } from './paginator';

type PaginatorStoryArgs = {
  ariaLabel: string;
  page: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions: number[];
  siblingCount: number;
  showEdges: boolean;
  disabled: boolean;
  size: PaginatorSize;
  variant: PaginatorVariant;
  appearance: PaginatorAppearance;
};

const meta: Meta<PaginatorStoryArgs> = {
  title: 'Shared UI/Paginator',
  component: Paginator,
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
    pageSizeOptions: {
      control: 'object',
    },
  },
  args: {
    ariaLabel: 'Paginacion',
    page: 3,
    totalItems: 248,
    pageSize: 10,
    pageSizeOptions: [],
    siblingCount: 1,
    showEdges: false,
    disabled: false,
    size: 'md',
    variant: 'primary',
    appearance: 'default',
  },
  render: (args) => ({
    props: args,
    template: `
      <div class="max-w-3xl">
        <app-paginator
          [ariaLabel]="ariaLabel"
          [page]="page"
          [totalItems]="totalItems"
          [pageSize]="pageSize"
          [pageSizeOptions]="pageSizeOptions"
          [siblingCount]="siblingCount"
          [showEdges]="showEdges"
          [disabled]="disabled"
          [size]="size"
          [variant]="variant"
          [appearance]="appearance"
          (pageChange)="page = $event"
          (pageSizeChange)="pageSize = $event; page = 1"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<PaginatorStoryArgs>;

export const Default: Story = {};

export const ManyPages: Story = {
  args: {
    page: 42,
    totalItems: 2500,
    pageSize: 10,
  },
};

export const WithPageSize: Story = {
  args: {
    page: 2,
    totalItems: 248,
    pageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
  },
};

export const WithEdges: Story = {
  args: {
    page: 12,
    totalItems: 420,
    pageSize: 10,
    showEdges: true,
  },
};

export const CompactSize: Story = {
  args: {
    page: 6,
    totalItems: 120,
    pageSize: 10,
    size: 'sm',
  },
};

export const Minimal: Story = {
  args: {
    appearance: 'minimal',
    page: 3,
    totalItems: 248,
    pageSize: 10,
  },
};

export const Variants: Story = {
  render: () => ({
    props: {
      primaryPage: 3,
      secondaryPage: 3,
      neutralPage: 3,
      dangerPage: 3,
      violetPage: 3,
    },
    template: `
      <div class="grid max-w-3xl gap-5">
        <app-paginator
          variant="primary"
          [page]="primaryPage"
          [totalItems]="120"
          [pageSize]="10"
          (pageChange)="primaryPage = $event"
        />
        <app-paginator
          variant="secondary"
          [page]="secondaryPage"
          [totalItems]="120"
          [pageSize]="10"
          (pageChange)="secondaryPage = $event"
        />
        <app-paginator
          variant="neutral"
          [page]="neutralPage"
          [totalItems]="120"
          [pageSize]="10"
          (pageChange)="neutralPage = $event"
        />
        <app-paginator
          variant="danger"
          [page]="dangerPage"
          [totalItems]="120"
          [pageSize]="10"
          (pageChange)="dangerPage = $event"
        />
        <app-paginator
          variant="violet"
          [page]="violetPage"
          [totalItems]="120"
          [pageSize]="10"
          (pageChange)="violetPage = $event"
        />
      </div>
    `,
  }),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Empty: Story = {
  args: {
    page: 1,
    totalItems: 0,
    pageSize: 10,
  },
};

export const CurrentNearStart: Story = {
  args: {
    page: 2,
    totalItems: 400,
    pageSize: 10,
  },
};

export const CurrentNearEnd: Story = {
  args: {
    page: 39,
    totalItems: 400,
    pageSize: 10,
  },
};
