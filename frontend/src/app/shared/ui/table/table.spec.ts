import { fireEvent, render, screen } from '@testing-library/angular';
import { Table, type TableColumn, type TableRow } from './table';

const columns: TableColumn[] = [
  { key: 'name', header: 'Cliente', sortable: true },
  { key: 'status', header: 'Estado' },
  { key: 'amount', header: 'Importe', align: 'right', sortable: true },
];

const rows: TableRow[] = [
  { id: '1', name: 'Acme', status: 'Activo', amount: '1.240 EUR' },
  { id: '2', name: 'Globex', status: 'Pendiente', amount: '860 EUR' },
];

describe('Table', () => {
  it('renders columns and rows', async () => {
    await render('<app-table [columns]="columns" [rows]="rows" />', {
      imports: [Table],
      componentProperties: { columns, rows },
    });

    expect(screen.getByRole('columnheader', { name: /Cliente/i })).toBeTruthy();
    expect(screen.getByText('Acme')).toBeTruthy();
    expect(screen.getByText('Globex')).toBeTruthy();
  });

  it('renders empty state', async () => {
    await render('<app-table [columns]="columns" [rows]="[]" emptyTitle="Sin clientes" />', {
      imports: [Table],
      componentProperties: { columns },
    });

    expect(screen.getByText('Sin clientes')).toBeTruthy();
  });

  it('emits selected row', async () => {
    const rowSelected = vi.fn();

    await render('<app-table [columns]="columns" [rows]="rows" (rowSelected)="rowSelected($event)" />', {
      imports: [Table],
      componentProperties: { columns, rows, rowSelected },
    });

    fireEvent.click(screen.getByText('Acme'));

    expect(rowSelected).toHaveBeenCalledWith(rows[0]);
  });

  it('updates selected ids when selecting rows', async () => {
    const selectedChange = vi.fn();

    await render('<app-table [columns]="columns" [rows]="rows" selectable (selectedChange)="selectedChange($event)" />', {
      imports: [Table],
      componentProperties: { columns, rows, selectedChange },
    });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar fila 1' }));

    expect(selectedChange).toHaveBeenCalledWith(['1']);
  });

  it('cycles sortable column state', async () => {
    const sortChange = vi.fn();

    await render('<app-table [columns]="columns" [rows]="rows" (sortChange)="sortChange($event)" />', {
      imports: [Table],
      componentProperties: { columns, rows, sortChange },
    });

    const sortButton = screen.getByRole('button', { name: 'Ordenar por Cliente' });
    fireEvent.click(sortButton);
    fireEvent.click(sortButton);
    fireEvent.click(sortButton);

    expect(sortChange).toHaveBeenNthCalledWith(1, { key: 'name', direction: 'asc' });
    expect(sortChange).toHaveBeenNthCalledWith(2, { key: 'name', direction: 'desc' });
    expect(sortChange).toHaveBeenNthCalledWith(3, null);
  });

  it('renders paginator when pagination is enabled', async () => {
    const pageChange = vi.fn();

    await render('<app-table [columns]="columns" [rows]="rows" pagination [totalItems]="40" [pageSize]="10" (pageChange)="pageChange($event)" />', {
      imports: [Table],
      componentProperties: { columns, rows, pageChange },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pagina siguiente' }));

    expect(pageChange).toHaveBeenCalledWith(2);
  });
});
