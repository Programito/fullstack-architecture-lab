import { fireEvent, render, screen, within } from '@testing-library/angular';
import { Paginator } from './paginator';

describe('Paginator', () => {
  it('renders pages calculated from total items and page size', async () => {
    await render('<app-paginator [page]="2" [totalItems]="95" [pageSize]="10" />', {
      imports: [Paginator],
    });

    expect(screen.getByRole('navigation', { name: 'Paginacion' })).toBeTruthy();
    expect(screen.getByText('11-20 de 95')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ir a pagina 2' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Ir a pagina 10' })).toBeTruthy();
  });

  it('emits page changes from page, previous, next, first, and last buttons', async () => {
    const pageChange = vi.fn();

    await render(
      '<app-paginator [page]="5" [totalItems]="100" [pageSize]="10" showEdges (pageChange)="pageChange($event)" />',
      {
        imports: [Paginator],
        componentProperties: {
          pageChange,
        },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ir a pagina 4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pagina anterior' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pagina siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Primera pagina' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ultima pagina' }));

    expect(pageChange).toHaveBeenNthCalledWith(1, 4);
    expect(pageChange).toHaveBeenNthCalledWith(2, 4);
    expect(pageChange).toHaveBeenNthCalledWith(3, 6);
    expect(pageChange).toHaveBeenNthCalledWith(4, 1);
    expect(pageChange).toHaveBeenNthCalledWith(5, 10);
  });

  it('disables first and previous on the first page', async () => {
    await render('<app-paginator [page]="1" [totalItems]="100" [pageSize]="10" showEdges />', {
      imports: [Paginator],
    });

    expect(screen.getByRole('button', { name: 'Primera pagina' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Pagina anterior' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Pagina siguiente' })).toHaveProperty('disabled', false);
  });

  it('disables last and next on the last page', async () => {
    await render('<app-paginator [page]="10" [totalItems]="100" [pageSize]="10" showEdges />', {
      imports: [Paginator],
    });

    expect(screen.getByRole('button', { name: 'Ultima pagina' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Pagina siguiente' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Pagina anterior' })).toHaveProperty('disabled', false);
  });

  it('renders clickable ellipsis when pages are hidden', async () => {
    await render('<app-paginator [page]="10" [totalItems]="300" [pageSize]="10" />', {
      imports: [Paginator],
    });

    expect(screen.getByRole('button', { name: 'Ir a pagina anterior oculta' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ir a pagina posterior oculta' })).toBeTruthy();
  });

  it('opens ellipsis popover and emits a valid direct page jump', async () => {
    const pageChange = vi.fn();

    await render('<app-paginator [page]="10" [totalItems]="300" [pageSize]="10" (pageChange)="pageChange($event)" />', {
      imports: [Paginator],
      componentProperties: {
        pageChange,
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Ir a pagina anterior oculta' }));
    fireEvent.input(screen.getByLabelText('Pagina'), { target: { value: '7' } });
    fireEvent.keyDown(screen.getByLabelText('Pagina'), { key: 'Enter' });

    expect(pageChange).toHaveBeenCalledWith(7);
    expect(screen.queryByRole('dialog', { name: 'Ir a pagina' })).toBeNull();
  });

  it('does not emit invalid direct page jumps and marks the input invalid', async () => {
    const pageChange = vi.fn();

    await render('<app-paginator [page]="10" [totalItems]="300" [pageSize]="10" (pageChange)="pageChange($event)" />', {
      imports: [Paginator],
      componentProperties: {
        pageChange,
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Ir a pagina anterior oculta' }));
    fireEvent.input(screen.getByLabelText('Pagina'), { target: { value: '99' } });
    fireEvent.keyDown(screen.getByLabelText('Pagina'), { key: 'Enter' });

    expect(pageChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Pagina').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Introduce una pagina entre 1 y 30.')).toBeTruthy();
  });

  it('renders page size options and emits page size changes', async () => {
    const pageSizeChange = vi.fn();

    await render(
      '<app-paginator [page]="1" [totalItems]="100" [pageSize]="10" [pageSizeOptions]="[10, 25, 50]" (pageSizeChange)="pageSizeChange($event)" />',
      {
        imports: [Paginator],
        componentProperties: {
          pageSizeChange,
        },
      },
    );

    fireEvent.change(screen.getByLabelText('Por pagina'), { target: { value: '25' } });

    expect(pageSizeChange).toHaveBeenCalledWith(25);
  });

  it('applies size, variant, appearance, disabled, and active classes', async () => {
    const { container } = await render(
      '<app-paginator [page]="2" [totalItems]="100" [pageSize]="10" size="lg" variant="violet" appearance="minimal" disabled />',
      {
        imports: [Paginator],
      },
    );

    const paginator = container.querySelector('.paginator');
    expect(paginator?.className).toContain('paginator--lg');
    expect(paginator?.className).toContain('paginator--violet');
    expect(paginator?.className).toContain('paginator--minimal');
    expect(paginator?.className).toContain('paginator--disabled');
    expect(screen.getByRole('button', { name: 'Ir a pagina 2' }).className).toContain('paginator__button--active');
  });

  it('handles the empty state without navigation', async () => {
    await render('<app-paginator [page]="1" [totalItems]="0" [pageSize]="10" />', {
      imports: [Paginator],
    });

    expect(screen.getByText('0 de 0')).toBeTruthy();
    expect(screen.getByText('Pagina 0 de 0')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Pagina anterior' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Pagina siguiente' })).toHaveProperty('disabled', true);
    expect(within(screen.getByRole('navigation', { name: 'Paginacion' })).queryByRole('button', { name: /Ir a pagina \\d+/ })).toBeNull();
  });
});
