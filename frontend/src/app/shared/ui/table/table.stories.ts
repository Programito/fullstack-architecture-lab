import type { Meta, StoryObj } from '@storybook/angular';
import { Table, type TableAppearance, type TableColumn, type TableRow, type TableSize, type TableVariant } from './table';

const columns: TableColumn[] = [
  { key: 'name', header: 'Cliente', sortable: true },
  { key: 'status', header: 'Estado' },
  { key: 'amount', header: 'Importe', align: 'right', sortable: true },
];

const rows: TableRow[] = [
  { id: '1', name: 'Acme', status: 'Activo', amount: '1.240 EUR' },
  { id: '2', name: 'Globex', status: 'Pendiente', amount: '860 EUR' },
  { id: '3', name: 'Umbrella', status: 'Bloqueado', amount: '320 EUR' },
];

type TableStoryArgs = {
  columns: TableColumn[];
  rows: TableRow[];
  rowId: string;
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  selectable: boolean;
  pagination: boolean;
  page: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions: number[];
  size: TableSize;
  variant: TableVariant;
  appearance: TableAppearance;
  selected: string[];
};

const meta: Meta<TableStoryArgs> = {
  title: 'Shared UI/Table',
  component: Table,
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
    columns,
    rows,
    rowId: 'id',
    loading: false,
    emptyTitle: 'Sin clientes',
    emptyDescription: 'Cuando haya clientes apareceran en esta tabla.',
    selectable: false,
    pagination: false,
    page: 1,
    totalItems: 42,
    pageSize: 10,
    pageSizeOptions: [],
    size: 'md',
    variant: 'primary',
    appearance: 'default',
    selected: [],
  },
  render: (args) => ({
    props: args,
    template: `
      <app-table
        [columns]="columns"
        [rows]="rows"
        [rowId]="rowId"
        [loading]="loading"
        [emptyTitle]="emptyTitle"
        [emptyDescription]="emptyDescription"
        [selectable]="selectable"
        [pagination]="pagination"
        [page]="page"
        [totalItems]="totalItems"
        [pageSize]="pageSize"
        [pageSizeOptions]="pageSizeOptions"
        [size]="size"
        [variant]="variant"
        [appearance]="appearance"
        [(selected)]="selected"
        (pageChange)="page = $event"
      />
    `,
  }),
};

export default meta;

type Story = StoryObj<TableStoryArgs>;

export const Default: Story = {};
export const Loading: Story = { args: { loading: true } };
export const Empty: Story = { args: { rows: [] } };
export const Selectable: Story = { args: { selectable: true, selected: ['2'] } };
export const Sortable: Story = {};
export const Paginated: Story = { args: { pagination: true, page: 2, pageSizeOptions: [10, 25, 50] } };
export const Alignments: Story = {
  args: {
    columns: [
      { key: 'left', header: 'Izquierda' },
      { key: 'center', header: 'Centro', align: 'center' },
      { key: 'right', header: 'Derecha', align: 'right' },
    ],
    rows: [{ id: '1', left: 'Texto', center: 'Medio', right: 'Final' }],
  },
};
export const Sizes: Story = {
  render: () => ({
    props: { columns, rows },
    template: `
      <div class="grid gap-5">
        <app-table size="sm" [columns]="columns" [rows]="rows" />
        <app-table [columns]="columns" [rows]="rows" />
        <app-table size="lg" [columns]="columns" [rows]="rows" />
      </div>
    `,
  }),
};
