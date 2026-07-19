import { fireEvent, render, screen, within } from '@testing-library/angular';
import { signal } from '@angular/core';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import type { RestaurantFloorsDto, ServiceFloorDto } from '../../api/restaurant-pos-api.models';
import { RestaurantPosApiService } from '../../api/restaurant-pos-api.service';
import { RestaurantContextStore } from '../../state/restaurant-context.store';
import { RestaurantFloorLoader } from '../../state/restaurant-floor-loader.service';
import { DEFAULT_GRID_COLUMNS, DEFAULT_GRID_ROWS, MOCK_FLOOR_ELEMENTS, MOCK_RESTAURANT_TABLES } from '../../state/restaurant-pos.mock-data';
import { RestaurantPosStore } from '../../state/restaurant-pos.store';
import { RestaurantPosLayoutPage } from './restaurant-pos-layout-page';

describe('RestaurantPosLayoutPage', () => {
  const createDefaultFloorsResponse = (): RestaurantFloorsDto => ({
    restaurantId: 'restaurant-mesaflow-centro',
    tables: MOCK_RESTAURANT_TABLES.map((table) => ({
      id: table.id,
      tableNumber: table.number,
      name: `Mesa ${table.number}`,
      capacity: table.capacity,
      isActive: true,
    })),
    floors: [
      {
        id: 'floor-main',
        name: 'Sala principal',
        rows: DEFAULT_GRID_ROWS,
        columns: DEFAULT_GRID_COLUMNS,
        elements: MOCK_FLOOR_ELEMENTS.map((element, index) => ({
          id: element.id,
          type: element.type,
          label: element.label,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          tableId: element.tableId ?? null,
          shape: element.shape ?? null,
          sortOrder: index + 1,
        })),
      },
    ],
  });

  const createDefaultServiceFloorResponse = (): ServiceFloorDto => {
    const response = createDefaultFloorsResponse();
    const floor = response.floors[0]!;

    return {
      restaurantId: response.restaurantId,
      floor: {
        id: floor.id,
        name: floor.name,
        rows: floor.rows,
        columns: floor.columns,
      },
      elements: floor.elements.map(({ sortOrder: _sortOrder, ...element }) => element),
      servicePoints: response.tables.map((table) => ({
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          name: table.name,
          capacity: table.capacity,
          status: 'free',
          serviceStartedAt: null,
        },
        summary: {
          lineCount: 0,
          guestCount: 0,
          totalCents: 0,
          currency: 'EUR',
          servicePhase: { course: 'none', status: 'no_order' },
        },
      })),
      totals: {
        servicePointCount: response.tables.length,
        occupiedCount: 0,
        openOrderCount: 0,
      },
    };
  };

  const createRestaurantContextMock = (restaurantCount: 'single' | 'multiple' | 'empty' = 'single') => {
    const restaurants =
      restaurantCount === 'single'
        ? [
            {
              id: 'restaurant-mesaflow-centro',
              name: 'MesaFlow Centro',
              displayName: 'MesaFlow Centro',
              timezone: 'Europe/Madrid',
              currency: 'EUR',
              isActive: true,
            },
          ]
        : restaurantCount === 'multiple'
          ? [
              {
                id: 'restaurant-mesaflow-centro',
                name: 'MesaFlow Centro',
                displayName: 'MesaFlow Centro',
                timezone: 'Europe/Madrid',
                currency: 'EUR',
                isActive: true,
              },
              {
                id: 'restaurant-mesaflow-norte',
                name: 'MesaFlow Norte',
                displayName: 'MesaFlow Norte',
                timezone: 'Europe/Madrid',
                currency: 'EUR',
                isActive: true,
              },
            ]
          : [];

    return {
      load: vi.fn(),
      activeRestaurant: () => (restaurantCount === 'single' ? restaurants[0] : null),
      isLoading: () => false,
      loadError: () => null,
      multipleRestaurants: () => restaurantCount === 'multiple',
      hasNoRestaurants: () => restaurantCount === 'empty',
      restaurants: () => restaurants,
    };
  };

  const renderLayoutPage = async (
    locale = 'es',
    options?: {
      restaurantContext?: ReturnType<typeof createRestaurantContextMock>;
      apiOverrides?: Partial<RestaurantPosApiService>;
      floorLoader?: Pick<RestaurantFloorLoader, 'load' | 'retry'>;
    },
  ) => {
    const i18n = provideI18nTesting(locale);
    const restaurantContext = options?.restaurantContext ?? createRestaurantContextMock();
    let responseState = createDefaultFloorsResponse();
    const defaultCreateFloorElement = vi.fn(
      (restaurantId: string, _floorId: string, body: { type: string; label: string; x: number; y: number; width: number; height: number; tableId: string | null; shape: string | null; sortOrder: number }) => {
        const nextTables = [...responseState.tables];
        const nextElements = [...responseState.floors[0]!.elements];
        let tableId = body.tableId;

        if ((body.type === 'table' || body.type === 'stool') && !tableId) {
          const nextTableNumber = Math.max(0, ...nextTables.map((table) => table.tableNumber)) + 1;
          tableId = body.type === 'stool' ? `stool-${nextTableNumber}` : `table-${nextTableNumber}`;
          nextTables.push({
            id: tableId,
            tableNumber: nextTableNumber,
            name: `Mesa ${nextTableNumber}`,
            capacity: body.type === 'stool' ? 1 : 4,
            isActive: true,
          });
        }

        nextElements.push({
          id: `floor-element-${nextElements.length + 1}`,
          type: body.type as RestaurantFloorsDto['floors'][number]['elements'][number]['type'],
          label: body.label,
          x: body.x,
          y: body.y,
          width: body.width,
          height: body.height,
          tableId,
          shape: body.shape as RestaurantFloorsDto['floors'][number]['elements'][number]['shape'],
          sortOrder: body.sortOrder,
        });

        responseState = {
          restaurantId,
          tables: nextTables,
          floors: [{ ...responseState.floors[0]!, elements: nextElements }],
        };

        return of(responseState);
      },
    );
    const defaultUpdateFloor = vi.fn((restaurantId: string, floorId: string, body: { name: string; rows: number; columns: number }) => {
      responseState = {
        restaurantId,
        tables: responseState.tables,
        floors: responseState.floors.map((floor) =>
          floor.id === floorId ? { ...floor, name: body.name, rows: body.rows, columns: body.columns } : floor,
        ),
      };

      return of(responseState);
    });
    const defaultUpdateFloorElement = vi.fn(
      (
        restaurantId: string,
        floorId: string,
        elementId: string,
        body: {
          label: string;
          x: number;
          y: number;
          width: number;
          height: number;
          shape: string | null;
          capacity: number | null;
        },
      ) => {
        responseState = {
          restaurantId,
          tables: responseState.tables.map((table) =>
            table.id === responseState.floors[0]!.elements.find((element) => element.id === elementId)?.tableId
              ? {
                  ...table,
                  name: body.label,
                  capacity: body.capacity ?? table.capacity,
                }
              : table,
          ),
          floors: responseState.floors.map((floor) =>
            floor.id === floorId
              ? {
                  ...floor,
                  elements: floor.elements.map((element) =>
                    element.id === elementId
                      ? {
                          ...element,
                          label: body.label,
                          x: body.x,
                          y: body.y,
                          width: body.width,
                          height: body.height,
                          shape: body.shape as RestaurantFloorsDto['floors'][number]['elements'][number]['shape'],
                        }
                      : element,
                  ),
                }
              : floor,
          ),
        };

        return of(responseState);
      },
    );
    const defaultReorderFloorElements = vi.fn(
      (
        restaurantId: string,
        floorId: string,
        body: {
          elements: Array<{ id: string; x: number; y: number; width: number; height: number; sortOrder: number }>;
        },
      ) => {
        const updates = new Map(body.elements.map((element) => [element.id, element]));
        responseState = {
          restaurantId,
          tables: responseState.tables,
          floors: responseState.floors.map((floor) =>
            floor.id === floorId
              ? {
                  ...floor,
                  elements: floor.elements
                    .map((element) => {
                      const update = updates.get(element.id);
                      return update ? { ...element, ...update } : element;
                    })
                    .sort((left, right) => left.sortOrder - right.sortOrder),
                }
              : floor,
          ),
        };

        return of(responseState);
      },
    );
    const api = {
      listRestaurants: vi.fn(() => of([])),
      getRestaurantFloors: vi.fn(() => of(responseState)),
      getRestaurantServiceFloor: vi.fn(() => of(createDefaultServiceFloorResponse())),
      createFloorElement: defaultCreateFloorElement,
      updateFloor: defaultUpdateFloor,
      updateFloorElement: defaultUpdateFloorElement,
      reorderFloorElements: defaultReorderFloorElements,
      ...(options?.apiOverrides ?? {}),
    };

    const view = await render(RestaurantPosLayoutPage, {
      imports: [...i18n.imports],
      providers: [
        ...i18n.providers,
        { provide: RestaurantContextStore, useValue: restaurantContext },
        { provide: RestaurantPosApiService, useValue: api },
        ...(options?.floorLoader ? [{ provide: RestaurantFloorLoader, useValue: options.floorLoader }] : []),
      ],
    });

    return {
      ...view,
      api,
      restaurantContext,
    };
  };

  const createLayoutPageActions = () => {
    const openAddElementDialog = () => {
      fireEvent.click(screen.getByRole('button', { name: 'Añadir elemento' }));
      return screen.getByRole('dialog', { name: 'Añadir elemento' });
    };

    const openResizeLayoutDialog = () => {
      fireEvent.click(screen.getByRole('button', { name: 'Redimensionar plano' }));
      return screen.getByRole('dialog', { name: 'Redimensionar plano' });
    };

    const selectFloorElement = (label: string) => {
      fireEvent.click(screen.getByLabelText(`${label} elemento del plano`));
    };

    const openEditElementDialog = (label: string) => {
      selectFloorElement(label);
      fireEvent.click(screen.getByRole('button', { name: `Editar ${label}` }));
      return screen.getByRole('dialog', { name: 'Editar elemento' });
    };

    const openResizeElementDialog = (label: string) => {
      selectFloorElement(label);
      fireEvent.click(screen.getByRole('button', { name: `Redimensionar ${label}` }));
      return screen.getByRole('dialog', { name: 'Redimensionar elemento' });
    };

    const choosePosition = (column: number, row: number) => {
      fireEvent.click(screen.getByRole('button', { name: `Colocar en columna ${column} fila ${row}` }));
    };

    const fillElementForm = (values: {
      type?: string;
      preset?: string;
      label?: string;
      width?: number;
      height?: number;
      capacity?: number;
    }) => {
      if (values.type) {
        fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: values.type } });
      }

      if (values.preset) {
        fireEvent.change(screen.getByLabelText('Tamaño predefinido'), { target: { value: values.preset } });
      }

      if (values.label !== undefined) {
        fireEvent.input(screen.getByLabelText('Etiqueta del elemento'), { target: { value: values.label } });
      }

      if (values.width !== undefined) {
        fireEvent.input(screen.getByLabelText('Ancho'), { target: { value: String(values.width) } });
      }

      if (values.height !== undefined) {
        fireEvent.input(screen.getByLabelText('Alto'), { target: { value: String(values.height) } });
      }

      if (values.capacity !== undefined) {
        fireEvent.input(screen.getByLabelText('Capacidad de mesa'), { target: { value: String(values.capacity) } });
      }
    };

    const submitAddElement = () => {
      fireEvent.click(within(screen.getByRole('dialog', { name: 'Añadir elemento' })).getByRole('button', { name: /Añadir/i }));
    };

    const submitEditElement = () => {
      fireEvent.click(within(screen.getByRole('dialog', { name: 'Editar elemento' })).getByRole('button', { name: 'Editar' }));
    };

    const submitResizeLayout = () => {
      fireEvent.click(screen.getByRole('button', { name: 'Aplicar tamaño del plano' }));
    };

    const submitResizeElement = () => {
      fireEvent.click(screen.getByRole('button', { name: 'Aplicar tamaño' }));
    };

    return {
      choosePosition,
      fillElementForm,
      openAddElementDialog,
      openEditElementDialog,
      openResizeElementDialog,
      openResizeLayoutDialog,
      selectFloorElement,
      submitAddElement,
      submitEditElement,
      submitResizeElement,
      submitResizeLayout,
    };
  };

  it('shows an accessible spinner without mock tables while the floor is loading', async () => {
    const response = new Subject<ServiceFloorDto>();
    await renderLayoutPage('es', {
      apiOverrides: { getRestaurantServiceFloor: vi.fn(() => response.asObservable()) },
    });

    expect(screen.getByText('Cargando plano de mesas…')).toBeTruthy();
    expect(screen.getByTestId('floor-loading-state').getAttribute('aria-busy')).toBe('true');
    expect(screen.getByTestId('floor-loading-state').querySelector('.animate-spin')?.className).toContain('motion-reduce:animate-none');
    expect(screen.queryByLabelText('M1 elemento del plano')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Añadir elemento' })).toBeNull();
    expect(screen.queryByLabelText('Estado del plano')).toBeNull();
  });

  it('loads the floor plan for the active restaurant from the service-floor snapshot', async () => {
    const serviceFloorResponse: ServiceFloorDto = {
      restaurantId: 'restaurant-mesaflow-centro',
      floor: {
        id: 'floor-main',
        name: 'Sala principal',
        rows: 12,
        columns: 16,
      },
      elements: [
        {
          id: 'floor-element-api-1',
          type: 'table',
          label: 'M11',
          x: 4,
          y: 4,
          width: 2,
          height: 2,
          tableId: 'table-api-1',
          shape: 'square',
        },
      ],
      servicePoints: [
        {
          table: {
            id: 'table-api-1',
            tableNumber: 11,
            name: 'Mesa 11',
            capacity: 4,
            status: 'free',
            serviceStartedAt: null,
          },
          summary: {
            lineCount: 0,
            guestCount: 0,
            totalCents: 0,
            currency: 'EUR',
            servicePhase: { course: 'none', status: 'no_order' },
          },
        },
      ],
      totals: { servicePointCount: 1, occupiedCount: 0, openOrderCount: 0 },
    };

    const { fixture, api } = await renderLayoutPage('es', {
      apiOverrides: {
        getRestaurantServiceFloor: vi.fn(() => of(serviceFloorResponse)),
      } as Partial<RestaurantPosApiService>,
    });

    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    expect(store.gridRows()).toBe(12);
    expect(store.gridColumns()).toBe(16);
    expect(store.floorElements()[0]?.label).toBe('M11');
    expect(store.activeFloorId()).toBe('floor-main');
    expect(store.activeFloorName()).toBe('Sala principal');
    expect(api.getRestaurantServiceFloor).toHaveBeenCalledWith('restaurant-mesaflow-centro');
    expect(api.getRestaurantFloors).not.toHaveBeenCalled();
  });

  it('shows a localized alert and retry action when the floor request fails', async () => {
    await renderLayoutPage('es', {
      apiOverrides: {
        getRestaurantServiceFloor: vi.fn(() => throwError(() => new Error('network'))),
      },
    });

    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('No se pudo cargar el plano de mesas.')).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(screen.queryByRole('toolbar', { name: 'Acciones de edición del plano' })).toBeNull();
    expect(screen.queryByLabelText('Estado del plano')).toBeNull();
  });

  it('retries a failed floor request and renders the emitted floor', async () => {
    const retryResponse = new Subject<ServiceFloorDto>();
    const getRestaurantServiceFloor = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('network')))
      .mockReturnValueOnce(retryResponse.asObservable());
    const { fixture } = await renderLayoutPage('es', {
      apiOverrides: { getRestaurantServiceFloor },
    });

    const stateContainer = screen.getByTestId('floor-load-state');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(getRestaurantServiceFloor).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Cargando plano de mesas…')).toBeTruthy();
    expect(screen.getByTestId('floor-load-state')).toBe(stateContainer);

    retryResponse.next(createDefaultServiceFloorResponse());
    retryResponse.complete();
    fixture.detectChanges();

    expect(screen.getByLabelText('M1 elemento del plano')).toBeTruthy();
    expect(screen.getByRole('toolbar', { name: 'Acciones de edición del plano' })).toBeTruthy();
  });

  it('shows the localized empty state when no floor has been configured', async () => {
    await renderLayoutPage('ca', {
      apiOverrides: {
        getRestaurantServiceFloor: vi.fn(() =>
          throwError(() => new HttpErrorResponse({ status: 404 })),
        ),
      },
    });

    expect(screen.getByText('Encara no hi ha cap plànol de taules configurat.')).toBeTruthy();
    expect(screen.queryByTestId('floor-loading-state')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByLabelText('M1 element del plànol')).toBeNull();
    expect(screen.queryByRole('toolbar')).toBeNull();
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
  });

  it('tracks only the active restaurant when requesting the floor', async () => {
    const internalLoaderStatus = signal<'loading' | 'error'>('loading');
    const activeRestaurant = signal({
      id: 'restaurant-mesaflow-centro',
      name: 'MesaFlow Centro',
      displayName: 'MesaFlow Centro',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      isActive: true,
    });
    const load = vi.fn(() => internalLoaderStatus());
    const restaurantContext = {
      ...createRestaurantContextMock(),
      activeRestaurant: activeRestaurant.asReadonly(),
    };

    const { fixture } = await renderLayoutPage('es', {
      restaurantContext,
      floorLoader: { load, retry: vi.fn() },
    });
    expect(load).toHaveBeenCalledTimes(1);

    internalLoaderStatus.set('error');
    fixture.detectChanges();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('closes stale editing state and ignores a late resize confirmation while the floor becomes unavailable', async () => {
    const { fixture, api } = await renderLayoutPage();
    const actions = createLayoutPageActions();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const component = fixture.componentInstance as unknown as {
      resizeModalOpen(): boolean;
      selectedLayoutElement(): unknown;
      applyResize(): void;
    };

    actions.selectFloorElement('M1');
    actions.openResizeLayoutDialog();
    fireEvent.input(screen.getByLabelText('Filas'), { target: { value: '9' } });
    fireEvent.input(screen.getByLabelText('Columnas'), { target: { value: '10' } });

    store.beginFloorLoad();
    fixture.detectChanges();

    expect(component.resizeModalOpen()).toBe(false);
    expect(component.selectedLayoutElement()).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Redimensionar plano' })).toBeNull();

    component.applyResize();

    expect(store.gridRows()).toBe(1);
    expect(store.gridColumns()).toBe(1);
    expect(api.updateFloor).not.toHaveBeenCalled();
  });

  it('persists a confirmed floor element deletion and applies the backend response', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deletedResponse = createDefaultFloorsResponse();
    deletedResponse.tables = deletedResponse.tables.filter((table) => table.id !== 'table-1');
    deletedResponse.floors[0]!.elements = deletedResponse.floors[0]!.elements.filter(
      (element) => element.id !== 'floor-element-1',
    );
    const deleteFloorElement = vi.fn(() => of(deletedResponse));
    const { api } = await renderLayoutPage('es', {
      apiOverrides: { deleteFloorElement } as unknown as Partial<RestaurantPosApiService>,
    });

    fireEvent.click(screen.getByLabelText('M1 elemento del plano'));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar M1' }));

    expect(api.deleteFloorElement).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'floor-main',
      'floor-element-1',
    );
    expect(screen.queryByLabelText('M1 elemento del plano')).toBeNull();
  });

  it('posts a new element and refreshes the layout from the backend response', async () => {
    const createFloorElement = vi.fn(() =>
      of({
        restaurantId: 'restaurant-mesaflow-centro',
        tables: createDefaultFloorsResponse().tables,
        floors: [
          {
            id: 'floor-main',
            name: 'Sala principal',
            rows: 20,
            columns: 20,
            elements: [
              ...createDefaultFloorsResponse().floors[0]!.elements,
              { id: 'floor-element-api-99', type: 'blocked', label: 'Zona temporal', x: 10, y: 9, width: 2, height: 1, tableId: null, shape: null, sortOrder: 9 },
            ],
          },
        ],
      } satisfies RestaurantFloorsDto),
    );

    const { api } = await renderLayoutPage('es', {
      apiOverrides: {
        createFloorElement,
      } as Partial<RestaurantPosApiService>,
    });
    const actions = createLayoutPageActions();

    actions.openAddElementDialog();
    actions.fillElementForm({ type: 'blocked-area', label: 'Zona temporal' });
    actions.choosePosition(11, 10);
    actions.submitAddElement();

    expect(api.createFloorElement).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'floor-main',
      expect.objectContaining({
        type: 'blocked',
        label: 'Zona temporal',
        x: 10,
        y: 9,
        width: 1,
        height: 1,
      }),
    );
    expect(screen.getByLabelText('Zona temporal elemento del plano')).toBeTruthy();
  });

  it('patches the floor dimensions and refreshes the layout', async () => {
    const updateFloor = vi.fn(() =>
      of({
        restaurantId: 'restaurant-mesaflow-centro',
        tables: createDefaultFloorsResponse().tables,
        floors: [
          {
            id: 'floor-main',
            name: 'Sala principal',
            rows: 9,
            columns: 10,
            elements: createDefaultFloorsResponse().floors[0]!.elements,
          },
        ],
      } satisfies RestaurantFloorsDto),
    );

    const { api } = await renderLayoutPage('es', {
      apiOverrides: {
        updateFloor,
      } as Partial<RestaurantPosApiService>,
    });
    const actions = createLayoutPageActions();

    actions.openResizeLayoutDialog();
    fireEvent.input(screen.getByLabelText('Filas'), { target: { value: '9' } });
    fireEvent.input(screen.getByLabelText('Columnas'), { target: { value: '10' } });
    actions.submitResizeLayout();

    expect(api.updateFloor).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'floor-main',
      expect.objectContaining({ name: 'Sala principal', rows: 9, columns: 10 }),
    );
    expect(screen.getByText('10 columnas x 9 filas')).toBeTruthy();
  });

  it('persists a reordered element arrangement through the backend', async () => {
    const reorderFloorElements = vi.fn(() =>
      of({
        restaurantId: 'restaurant-mesaflow-centro',
        tables: createDefaultFloorsResponse().tables,
        floors: [
          {
            id: 'floor-main',
            name: 'Sala principal',
            rows: 20,
            columns: 20,
            elements: createDefaultFloorsResponse()
              .floors[0]!
              .elements.map((element) => (element.id === 'floor-element-1' ? { ...element, x: 2, y: 3 } : element)),
          },
        ],
      } satisfies RestaurantFloorsDto),
    );

    const { fixture, api } = await renderLayoutPage('es', {
      apiOverrides: {
        reorderFloorElements,
      } as Partial<RestaurantPosApiService>,
    });

    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    store.moveFloorElement('floor-element-1', 2, 3);
    (fixture.componentInstance as any).handleFloorElementMoved(store.floorElements()[0]!);

    expect(api.reorderFloorElements).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'floor-main',
      expect.objectContaining({
        elements: expect.arrayContaining([expect.objectContaining({ id: 'floor-element-1', x: 2, y: 3 })]),
      }),
    );
    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(expect.objectContaining({ x: 2, y: 3 }));
  });

  it('shows a clean layout toolbar without technical grid controls on the page', async () => {
    await renderLayoutPage();

    expect(screen.getByText('Plano del restaurante')).toBeTruthy();
    expect(screen.getByText('Diseña el comedor, la barra, la cocina y las zonas de servicio.')).toBeTruthy();
    const toolbar = screen.getByRole('toolbar', { name: 'Acciones de edición del plano' });
    expect(within(toolbar).getByRole('button', { name: 'Redimensionar plano' }).className).toContain('button--neutral-clear');
    expect(within(toolbar).getByRole('button', { name: 'Añadir elemento' })).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: 'Guardar cambios' })).toHaveProperty('disabled', true);
    expect(within(toolbar).queryByRole('link', { name: 'Volver al modo servicio' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Volver al modo servicio' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cambiar a modo oscuro' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Idioma: Español' })).toBeNull();
    expect(screen.queryByRole('button', { name: /add row/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /add column/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /remove row/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /remove column/i })).toBeNull();
    expect(screen.queryByLabelText('Width')).toBeNull();
    expect(screen.queryByLabelText('Height')).toBeNull();
  });

  it('renders the layout header actions in Catalan', async () => {
    await renderLayoutPage('ca');

    expect(screen.getByRole('heading', { name: 'Plànol del restaurant' })).toBeTruthy();
    expect(screen.getByRole('toolbar', { name: "Accions d'edició del plànol" })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Afegir element' })).toBeTruthy();
  });

  it('shows compact layout status above the floor plan', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);

    expect(screen.getByText('Modo plano')).toBeTruthy();
    expect(screen.getByText('20 columnas x 20 filas')).toBeTruthy();
    expect(screen.getByText(`${store.floorElements().length} elementos`)).toBeTruthy();
    expect(screen.getByText('Ningún elemento seleccionado')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('M1 elemento del plano'));

    expect(screen.getByText('Seleccionado: M1')).toBeTruthy();
  });

  it('opens the resize layout modal from the toolbar', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    const dialog = actions.openResizeLayoutDialog();
    expect(within(dialog).getByRole('button', { name: 'Cerrar redimensionar plano' })).toBeTruthy();
    expect(within(dialog).getByLabelText('Controles de tamaño del plano')).toBeTruthy();
    expect(within(dialog).getByLabelText('Vista previa de redimensión')).toBeTruthy();
    expect(within(dialog).getByText('20 columnas x 20 filas')).toBeTruthy();
    expect(within(screen.getByLabelText('Matriz de redimensión')).getAllByRole('button').length).toBe(400);
    expect(screen.getByLabelText('Filas')).toHaveProperty('value', '20');
    expect(screen.getByLabelText('Columnas')).toHaveProperty('value', '20');
  });

  it('updates the rows and columns preview when selecting cells in the resize matrix', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    actions.openResizeLayoutDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar 8 columnas x 6 filas' }));

    expect(screen.getByText('8 columnas x 6 filas')).toBeTruthy();
    expect(screen.getByLabelText('Filas')).toHaveProperty('value', '6');
    expect(screen.getByLabelText('Columnas')).toHaveProperty('value', '8');
  });

  it('updates the visual matrix preview when typing rows and columns', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    actions.openResizeLayoutDialog();
    fireEvent.input(screen.getByLabelText('Filas'), { target: { value: '7' } });
    fireEvent.input(screen.getByLabelText('Columnas'), { target: { value: '9' } });

    expect(screen.getByText('9 columnas x 7 filas')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Seleccionar 9 columnas x 7 filas' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('prevents invalid resize when existing elements would be outside the grid', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const actions = createLayoutPageActions();

    actions.openResizeLayoutDialog();
    fireEvent.input(screen.getByLabelText('Columnas'), { target: { value: '5' } });
    actions.submitResizeLayout();
    fixture.detectChanges();

    expect(store.gridColumns()).toBe(20);
    expect(screen.getAllByText('No se puede redimensionar el plano porque algunos elementos quedarían fuera de la matriz.').length).toBeGreaterThan(0);
    expect(screen.getByRole('dialog', { name: 'Redimensionar plano' })).toBeTruthy();
  });

  it('applies a valid resize only after confirmation', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const actions = createLayoutPageActions();

    actions.openResizeLayoutDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar 10 columnas x 9 filas' }));

    expect(store.gridRows()).toBe(20);
    expect(store.gridColumns()).toBe(20);

    actions.submitResizeLayout();

    expect(store.gridRows()).toBe(9);
    expect(store.gridColumns()).toBe(10);
  });

  it('opens a separate add element modal from the toolbar', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    const dialog = actions.openAddElementDialog();
    expect(dialog).toBeTruthy();
    expect(dialog.className).toContain('theme-dialog');
    expect(within(dialog).getByRole('button', { name: 'Cerrar formulario de elemento' })).toBeTruthy();
    expect(within(dialog).getByLabelText('Configuración del elemento')).toBeTruthy();
    expect(within(dialog).getByLabelText('Vista previa del elemento seleccionado').className).toContain('border-[var(--ui-border)]');
    expect(screen.getByLabelText('Tipo de elemento')).toHaveProperty('value', 'small-table');
    expect(screen.getByLabelText('Tipo de elemento').className).toContain('theme-field');
    expect(screen.getByRole('option', { name: 'Barra horizontal' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Barra vertical' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Taburete' })).toBeTruthy();
    expect(screen.getByLabelText('Tamaño predefinido')).toHaveProperty('value', 'small-table');
    expect(screen.getByLabelText('Ancho')).toHaveProperty('value', '2');
    expect(screen.getByLabelText('Alto')).toHaveProperty('value', '2');
    expect(within(dialog).getByText('20 columnas x 20 filas')).toBeTruthy();
  });

  it('keeps the add element position selector visually clean while preserving accessible cell labels', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    actions.openAddElementDialog();

    const selector = screen.getByLabelText('Selector de posición');
    expect(within(selector).getByRole('button', { name: 'Colocar en columna 9 fila 9' })).toBeTruthy();
    expect(within(selector).queryByText('9,9')).toBeNull();
    expect(screen.getByText('Posición sin seleccionar')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Colocar en columna 9 fila 9' }));

    expect(screen.getByText('Columnas 9-10, filas 9-10')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Colocar en columna 9 fila 9' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Colocar en columna 10 fila 9' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Colocar en columna 9 fila 10' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Colocar en columna 10 fila 10' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Colocar en columna 9 fila 9' }).className).toContain('ring-cyan-700');
    expect(screen.getByRole('button', { name: 'Colocar en columna 10 fila 10' }).className).toContain('ring-cyan-500');

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Colocar en columna 12 fila 12' }));

    expect(screen.getByRole('button', { name: 'Colocar en columna 12 fila 12' }).className).toContain('bg-sky-100');
    expect(screen.getByRole('button', { name: 'Colocar en columna 9 fila 9' }).className).toContain('ring-cyan-700');
  });

  it('shows a selected element preview and summary in the add element modal', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    const dialog = actions.openAddElementDialog();
    expect(within(dialog).getByLabelText('Vista previa del elemento seleccionado')).toBeTruthy();
    expect(within(dialog).getByText('M8')).toBeTruthy();
    expect(within(dialog).getByText('2 pax')).toBeTruthy();
    expect(within(dialog).getByText('Tamaño: 2 x 2')).toBeTruthy();
    expect(within(dialog).getByText('Posición: sin seleccionar')).toBeTruthy();

    actions.choosePosition(9, 9);

    expect(within(dialog).getByText('Posición: columna 9, fila 9')).toBeTruthy();
  });

  it('updates the selected element preview when choosing another preset', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    actions.openAddElementDialog();
    actions.fillElementForm({ type: 'kitchen' });

    const dialog = screen.getByRole('dialog', { name: 'Añadir elemento' });
    expect(within(dialog).getAllByText('Cocina').length).toBeGreaterThan(1);
    expect(within(dialog).getByText('Tamaño: 2 x 1')).toBeTruthy();
    expect(within(dialog).queryByText('2 pax')).toBeNull();
  });

  it('syncs preset size with custom width and height inputs', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    actions.openAddElementDialog();
    actions.fillElementForm({ preset: 'square-table' });

    expect(screen.getByLabelText('Ancho')).toHaveProperty('value', '2');
    expect(screen.getByLabelText('Alto')).toHaveProperty('value', '2');

    fireEvent.input(screen.getByLabelText('Ancho'), { target: { value: '3' } });
    fireEvent.input(screen.getByLabelText('Alto'), { target: { value: '1' } });

    expect(screen.getByLabelText('Ancho')).toHaveProperty('value', '3');
    expect(screen.getByLabelText('Alto')).toHaveProperty('value', '1');
  });

  it('sets a vertical bar preset to one column by three rows', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    actions.openAddElementDialog();
    actions.fillElementForm({ type: 'bar-vertical' });

    expect(screen.getByLabelText('Ancho')).toHaveProperty('value', '1');
    expect(screen.getByLabelText('Alto')).toHaveProperty('value', '3');
    expect(screen.getByText('Tamaño: 1 x 3')).toBeTruthy();
    expect(screen.getAllByText('Barra vertical').some((element) => element.className.includes('theme-vertical-label'))).toBe(true);
  });

  it('updates generated element labels when changing presets until the user edits the label', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    actions.openAddElementDialog();

    expect(screen.getByLabelText('Etiqueta del elemento')).toHaveProperty('value', 'M8');

    fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'bar-vertical' } });
    expect(screen.getByLabelText('Etiqueta del elemento')).toHaveProperty('value', 'Barra vertical');

    fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'stool' } });
    expect(screen.getByLabelText('Etiqueta del elemento')).toHaveProperty('value', 'T4');

    fireEvent.input(screen.getByLabelText('Etiqueta del elemento'), { target: { value: 'VIP stool' } });
    fireEvent.change(screen.getByLabelText('Tipo de elemento'), { target: { value: 'kitchen' } });

    expect(screen.getByLabelText('Etiqueta del elemento')).toHaveProperty('value', 'VIP stool');
  });

  it('opens the element modal in edit mode from the floor plan toolbar', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    expect(actions.openEditElementDialog('M1')).toBeTruthy();
    expect(screen.getByLabelText('Etiqueta del elemento')).toHaveProperty('value', 'M1');
    expect(screen.getByLabelText('Capacidad de mesa')).toHaveProperty('value', '2');
  });

  it('uses the current grid size in the add element position selector', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const actions = createLayoutPageActions();

    store.setGridSize(9, 10);
    fixture.detectChanges();

    actions.openAddElementDialog();

    const selector = screen.getByLabelText('Selector de posición');
    expect(within(selector).getAllByRole('button').length).toBe(90);
    expect(within(screen.getByRole('dialog', { name: 'Añadir elemento' })).getByText('10 columnas x 9 filas')).toBeTruthy();
  });

  it('adds an element when a valid position is selected', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const initialElementCount = store.floorElements().length;
    const initialTableCount = store.restaurantTables().length;
    const actions = createLayoutPageActions();

    actions.openAddElementDialog();
    actions.choosePosition(9, 9);
    actions.submitAddElement();

    expect(store.floorElements().length).toBe(initialElementCount + 1);
    expect(store.restaurantTables().length).toBe(initialTableCount + 1);
    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        label: 'M8',
        x: 8,
        y: 8,
        width: 2,
        height: 2,
      }),
    );
  });

  it('keeps the add element dialog open when the backend create request fails', async () => {
    const apiError = new Error('create failed');
    const { fixture } = await renderLayoutPage('es', {
      apiOverrides: {
        createFloorElement: vi.fn(() => throwError(() => apiError)),
      },
    });
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const initialElementCount = store.floorElements().length;
    const actions = createLayoutPageActions();

    actions.openAddElementDialog();
    actions.choosePosition(9, 9);
    actions.submitAddElement();

    expect(screen.getByRole('dialog', { name: 'Añadir elemento' })).toBeTruthy();
    expect(store.floorElements().length).toBe(initialElementCount);
  });

  it('keeps the edit element dialog open when the backend update request fails', async () => {
    const apiError = new Error('update failed');
    await renderLayoutPage('es', {
      apiOverrides: {
        updateFloorElement: vi.fn(() => throwError(() => apiError)),
      },
    });
    const actions = createLayoutPageActions();

    actions.openEditElementDialog('M1');
    actions.fillElementForm({ label: 'Mesa editada' });
    actions.submitEditElement();

    expect(screen.getByRole('dialog', { name: 'Editar elemento' })).toBeTruthy();
  });

  it('adds an element with a custom occupied size', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const actions = createLayoutPageActions();

    actions.openAddElementDialog();
    actions.fillElementForm({ width: 3, height: 1 });
    actions.choosePosition(5, 10);
    actions.submitAddElement();

    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        width: 3,
        height: 1,
        x: 4,
        y: 9,
      }),
    );
  });

  it('adds a stool as a one-person service point', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const initialTableCount = store.restaurantTables().length;
    const actions = createLayoutPageActions();

    actions.openAddElementDialog();
    actions.fillElementForm({ type: 'stool' });
    actions.choosePosition(20, 20);
    expect(screen.getByLabelText('Etiqueta del elemento')).toHaveProperty('value', 'T4');
    actions.submitAddElement();

    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        type: 'stool',
        label: 'T4',
        width: 1,
        height: 1,
      }),
    );
    expect(store.restaurantTables().length).toBe(initialTableCount + 1);
    expect(store.restaurantTables().at(-1)).toEqual(expect.objectContaining({ capacity: 1, status: 'free', total: 0 }));
  });

  it('adds a vertical bar as a bar floor element without changing the model type', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const actions = createLayoutPageActions();

    actions.openAddElementDialog();
    actions.fillElementForm({ type: 'bar-vertical' });
    actions.choosePosition(10, 2);
    actions.submitAddElement();

    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        type: 'bar',
        label: 'Barra vertical',
        width: 1,
        height: 3,
        x: 9,
        y: 1,
      }),
    );
  });

  it('opens the resize element modal from the floor plan toolbar', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    expect(actions.openResizeElementDialog('M1')).toBeTruthy();
    expect(screen.getByLabelText('Ancho del elemento')).toHaveProperty('value', '2');
    expect(screen.getByLabelText('Alto del elemento')).toHaveProperty('value', '2');
  });

  it('applies a valid selected element resize', async () => {
    const updateFloorElement = vi.fn(() =>
      of({
        restaurantId: 'restaurant-mesaflow-centro',
        tables: createDefaultFloorsResponse().tables,
        floors: [
          {
            id: 'floor-main',
            name: 'Sala principal',
            rows: 20,
            columns: 20,
            elements: createDefaultFloorsResponse()
              .floors[0]!
              .elements.map((element) => (element.id === 'floor-element-1' ? { ...element, width: 3, height: 2 } : element)),
          },
        ],
      } satisfies RestaurantFloorsDto),
    );
    const { fixture, api } = await renderLayoutPage('es', {
      apiOverrides: {
        updateFloorElement,
      } as Partial<RestaurantPosApiService>,
    });
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const actions = createLayoutPageActions();

    actions.openResizeElementDialog('M1');
    fireEvent.input(screen.getByLabelText('Ancho del elemento'), { target: { value: '3' } });
    actions.submitResizeElement();

    expect(api.updateFloorElement).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'floor-main',
      'floor-element-1',
      expect.objectContaining({ label: 'M1', x: 1, y: 1, width: 3, height: 2, shape: null }),
    );
    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(expect.objectContaining({ width: 3, height: 2 }));
  });

  it('prevents an invalid selected element resize', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const actions = createLayoutPageActions();

    actions.openResizeElementDialog('M1');
    fireEvent.input(screen.getByLabelText('Ancho del elemento'), { target: { value: '6' } });
    actions.submitResizeElement();
    fixture.detectChanges();

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(expect.objectContaining({ width: 2, height: 2 }));
    expect(within(screen.getByRole('dialog', { name: 'Redimensionar elemento' })).getByText('No se puede colocar el elemento aquí.')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Redimensionar elemento' })).toBeTruthy();
  });

  it('keeps edge placement inside the grid for custom occupied sizes', async () => {
    const { fixture } = await renderLayoutPage();
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const actions = createLayoutPageActions();

    store.setGridSize(10, 10);
    fixture.detectChanges();

    actions.openAddElementDialog();
    actions.fillElementForm({ width: 2, height: 2 });
    actions.choosePosition(10, 10);
    actions.submitAddElement();

    expect(store.floorElements().at(-1)).toEqual(
      expect.objectContaining({
        x: 8,
        y: 8,
        width: 2,
        height: 2,
      }),
    );
  });

  it('persists element edits through the backend from the edit modal', async () => {
    const updateFloorElement = vi.fn(() =>
      of({
        restaurantId: 'restaurant-mesaflow-centro',
        tables: createDefaultFloorsResponse().tables.map((table) =>
          table.id === 'table-1' ? { ...table, capacity: 6, name: 'Mesa terraza 1' } : table,
        ),
        floors: [
          {
            id: 'floor-main',
            name: 'Sala principal',
            rows: 20,
            columns: 20,
            elements: createDefaultFloorsResponse()
              .floors[0]!
              .elements.map((element) =>
                element.id === 'floor-element-1' ? { ...element, label: 'Mesa terraza 1', width: 3, height: 2 } : element,
              ),
          },
        ],
      } satisfies RestaurantFloorsDto),
    );
    const { fixture, api } = await renderLayoutPage('es', {
      apiOverrides: {
        updateFloorElement,
      } as Partial<RestaurantPosApiService>,
    });
    const store = fixture.debugElement.injector.get(RestaurantPosStore);
    const actions = createLayoutPageActions();

    expect(actions.openEditElementDialog('M1')).toBeTruthy();
    actions.fillElementForm({ label: 'Terrace 1', width: 3, capacity: 6 });
    actions.choosePosition(2, 2);
    actions.submitEditElement();

    expect(api.updateFloorElement).toHaveBeenCalledWith(
      'restaurant-mesaflow-centro',
      'floor-main',
      'floor-element-1',
      expect.objectContaining({
        label: 'Terrace 1',
        x: 1,
        y: 1,
        width: 3,
        height: 2,
        shape: 'round',
        capacity: 6,
      }),
    );

    expect(store.floorElements().find((element) => element.id === 'floor-element-1')).toEqual(
      expect.objectContaining({ label: 'Mesa terraza 1', width: 3, height: 2 }),
    );
    expect(store.restaurantTables().find((table) => table.id === 'table-1')).toEqual(expect.objectContaining({ capacity: 6 }));
  });

  it('disables adding an element for an invalid position', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    actions.openAddElementDialog();
    actions.choosePosition(1, 1);

    expect(screen.getByText('La posición seleccionada no está disponible. Elige otra celda libre dentro de la matriz.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Añadir M8' })).toHaveProperty('disabled', true);
  });

  it('marks cells where the selected element cannot be placed as unavailable', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    actions.openAddElementDialog();
    actions.fillElementForm({ width: 2 });

    const availableCell = screen.getByRole('button', { name: 'Colocar en columna 9 fila 9' });
    expect(availableCell.className).toContain('bg-emerald-50');

    const unavailableCell = screen.getByRole('button', { name: 'Colocar en columna 1 fila 1' });
    expect(unavailableCell.getAttribute('aria-disabled')).toBe('true');
    expect(unavailableCell.className).toContain('cursor-not-allowed');
    expect(unavailableCell.className).toContain('repeating-linear-gradient');
  });

  it('allows the last matrix cell to anchor a fitting element inside the layout', async () => {
    await renderLayoutPage();
    const actions = createLayoutPageActions();

    actions.openAddElementDialog();
    actions.choosePosition(20, 20);

    expect(screen.getByText('Columnas 19-20, filas 19-20')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Añadir M8' })).toHaveProperty('disabled', false);
  });
});
