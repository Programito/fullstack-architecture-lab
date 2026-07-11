import { render, screen, fireEvent, waitFor } from '@testing-library/angular';
import { provideRouter } from '@angular/router';

import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { DeveloperTablesPage } from './developer-tables-page';

describe('DeveloperTablesPage', () => {
  const renderPage = async () => {
    const i18n = provideI18nTesting();

    return render(DeveloperTablesPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        provideRouter([]),
      ],
    });
  };

  it('renders the schema overview and the default selected table', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { name: /Mapa de tablas/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /renderizar diagrama/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /ver source mermaid/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /abrir en grande/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /vista compacta/i })).toBeTruthy();
    expect(screen.queryByText((content) => content.includes('flowchart LR'))).toBeNull();
    expect(screen.getAllByText('users').length).toBeGreaterThan(0);
    expect(screen.getAllByText('orders').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'users' })).toBeTruthy();
    expect(screen.getByText('email')).toBeTruthy();
    expect(screen.getByText('accountType')).toBeTruthy();
    expect(screen.getByText('PK')).toBeTruthy();
    expect(screen.getAllByText('String').length).toBeGreaterThan(0);
  });

  it('shows the entity inventory sorted by table name', async () => {
    await renderPage();

    const rows = screen.getAllByRole('row');

    expect(rows[1]?.textContent).toContain('app_logs');
    expect(screen.getAllByText(/tablas visibles/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/features activas/i)).toBeTruthy();
    expect(screen.getByText(/dominios activos/i)).toBeTruthy();
  });

  it('updates the detail panel when another table is selected', async () => {
    await renderPage();

    const ordersRow = screen
      .getAllByRole('row')
      .find((row) => row.textContent?.replace(/\s+/g, ' ').includes('orders orders service'));

    expect(ordersRow).toBeTruthy();
    fireEvent.click(ordersRow!);

    expect(screen.getByRole('heading', { name: 'orders' })).toBeTruthy();
    expect(screen.getByText(/15 campos · 2 relaciones/i)).toBeTruthy();
    expect(screen.getAllByText(/2 relaciones/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /ir a la tabla restaurants/i }).length).toBeGreaterThan(0);
    expect(screen.getByText('dailyNumber')).toBeTruthy();
    expect(screen.getAllByText('FK').length).toBeGreaterThan(0);
    expect(screen.getAllByText('orders.restaurantId -> restaurants.id').length).toBeGreaterThan(0);
  });

  it('filters fields inside the selected table detail', async () => {
    await renderPage();

    const ordersRow = screen
      .getAllByRole('row')
      .find((row) => row.textContent?.replace(/\s+/g, ' ').includes('orders orders service'));

    expect(ordersRow).toBeTruthy();
    fireEvent.click(ordersRow!);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'orders' })).toBeTruthy();
    });

    fireEvent.input(screen.getByRole('searchbox', { name: /buscar campos/i }), {
      target: { value: 'dailyNumber' },
    });

    expect(screen.getByText('dailyNumber')).toBeTruthy();
    expect(screen.queryByText('status')).toBeNull();
  });

  it('filters schemas by search query', async () => {
    await renderPage();

    fireEvent.input(screen.getByRole('searchbox', { name: /buscar tablas o campos/i }), {
      target: { value: 'dailyNumber' },
    });

    expect(screen.queryByRole('heading', { name: 'users' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'orders' })).toBeTruthy();
    expect(screen.getByText('dailyNumber')).toBeTruthy();
    expect(screen.queryByText(/table_users/)).toBeNull();
  });

  it('filters schemas by domain and can reset filters', async () => {
    await renderPage();

    const domainSelect = screen.getByRole('combobox', { name: /dominio/i });
    fireEvent.change(domainSelect, { target: { value: 'service' } });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'users' })).toBeNull();
      expect((domainSelect as HTMLSelectElement).value).toBe('service');
      expect(
        screen
          .getAllByRole('row')
          .some((row) => row.textContent?.replace(/\s+/g, ' ').includes('orders orders service')),
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: /limpiar filtros/i }));

    await waitFor(() => {
      expect(screen.getAllByText('users').length).toBeGreaterThan(0);
    });
  });

  it('filters schemas by feature', async () => {
    await renderPage();

    const featureSelect = screen.getByRole('combobox', { name: /feature/i });
    fireEvent.change(featureSelect, { target: { value: 'orders' } });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'users' })).toBeNull();
      expect((featureSelect as HTMLSelectElement).value).toBe('orders');
      expect(
        screen
          .getAllByRole('row')
          .some((row) => row.textContent?.replace(/\s+/g, ' ').includes('orders orders service')),
      ).toBe(true);
    });
  });

  it('toggles compact mode in the detail tools', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /vista compacta/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /vista c/i })).toBeTruthy();
    });
  });

  it('can collapse and expand the filters card', async () => {
    await renderPage();

    expect(screen.getByRole('searchbox', { name: /buscar tablas o campos/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /ocultar filtros/i }));

    await waitFor(() => {
      expect(screen.queryByRole('searchbox', { name: /buscar tablas o campos/i })).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: /mostrar filtros/i }));

    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: /buscar tablas o campos/i })).toBeTruthy();
    });
  });

  it('navigates to a related table and clears filters when needed', async () => {
    await renderPage();

    const featureSelect = screen.getByRole('combobox', { name: /feature/i });
    fireEvent.change(featureSelect, { target: { value: 'orders' } });

    await waitFor(() => {
      expect((featureSelect as HTMLSelectElement).value).toBe('orders');
    });

    const ordersRow = screen
      .getAllByRole('row')
      .find((row) => row.textContent?.replace(/\s+/g, ' ').includes('orders orders service'));

    expect(ordersRow).toBeTruthy();
    fireEvent.click(ordersRow!);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'orders' })).toBeTruthy();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /ir a la tabla restaurants/i })[0]!);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'restaurants' })).toBeTruthy();
      expect(screen.getAllByText('users').length).toBeGreaterThan(0);
    });
  });

  it('keeps mermaid render behind explicit user action', async () => {
    await renderPage();

    expect(screen.getByText(/renderiza el svg solo cuando lo necesites/i)).toBeTruthy();
    expect(screen.getByText(/haz click en una tabla del diagrama para abrir su detalle/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /renderizar diagrama/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ocultar render/i })).toBeTruthy();
    });
  });

  it('opens the mermaid source inside a dialog', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /ver source mermaid/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /source mermaid/i })).toBeTruthy();
      expect(screen.getByText((content) => content.includes('flowchart LR'))).toBeTruthy();
    });
  });

  it('opens the fullscreen diagram dialog', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /abrir en grande/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /diagrama de relaciones/i })).toBeTruthy();
    });
  });

  it('includes clickable mermaid links in the generated source', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /ver source mermaid/i }));

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('click table_users href "#schema-users" "users"'))).toBeTruthy();
    });
  });

  it('selects a table when clicking a mermaid link', async () => {
    const view = await renderPage();
    const component = view.fixture.componentInstance as DeveloperTablesPage & {
      selectSchemaFromDiagram(event: MouseEvent): void;
    };

    const link = document.createElementNS('http://www.w3.org/2000/svg', 'a');
    link.setAttribute('href', '#schema-orders');
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    link.appendChild(node);
    document.body.appendChild(link);

    component.selectSchemaFromDiagram({ target: node, preventDefault: () => undefined } as unknown as MouseEvent);
    view.fixture.detectChanges();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'orders' })).toBeTruthy();
      expect(screen.getByText('dailyNumber')).toBeTruthy();
    });

    link.remove();
  });
});
